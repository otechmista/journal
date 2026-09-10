import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PATHS } from './paths.js';
import { buildFeedDocument, mergeFeeds } from './feed.js';
import { fetchAndParseRss } from './rss.js';
import { scrapeSource } from './scrape.js';
import { enrichItems } from './article.js';
import { loadSources } from './sources.js';
import {
	DEFAULT_RETENTION_DAYS,
	validateFeedDocument,
	validateStatusDocument
} from '../../shared/contracts.js';

/**
 * @param {{ sourceId?: string, saveSnapshot?: boolean, maxArticles?: number }} [opts]
 */
export async function runCrawl(opts = {}) {
	await mkdir(PATHS.feedsDir, { recursive: true });
	await mkdir(dirname(PATHS.status), { recursive: true });

	const catalog = await loadSources();
	let sources = catalog.sources.filter((s) => s.enabled);
	if (opts.sourceId) {
		sources = sources.filter((s) => s.id === opts.sourceId);
		if (!sources.length) throw new Error(`Source not found or disabled: ${opts.sourceId}`);
	}
	const enabledSourceIds = new Set(catalog.sources.filter((s) => s.enabled).map((s) => s.id));
	const authoritativeSourceIds = new Set();
	/** @type {any[]} */
	const jobs = [];
	/** @type {import('./feed.js').FeedItem[][]} */
	const snapshots = [];

	for (const source of sources) {
		const job = {
			id: `job_${source.id}_${Date.now()}`,
			source_id: source.id,
			state: 'running',
			started_at: new Date().toISOString(),
			finished_at: null,
			items_found: 0,
			items_downloaded: 0,
			error: null,
			warning: null
		};
		jobs.push(job);

		try {
			let items = [];
			if (source.type === 'rss') {
				items = await fetchAndParseRss(source.url, source);
			} else if (source.type === 'scrape') {
				const result = await scrapeSource(source);
				items = result.items;
			} else {
				throw new Error(`Unknown source type: ${source.type}`);
			}

			job.items_found = items.length;
			if (items.length === 0) {
				job.warning = 'No items found; previous items are preserved during the retention window.';
			}
			const limited = opts.maxArticles ? items.slice(0, opts.maxArticles) : items;
			const delayMs = source.crawl?.delay_ms ?? 400;
			const enriched = await enrichItems(limited, {
				delayMs,
				saveSnapshot: opts.saveSnapshot === true
			});
			job.items_downloaded = enriched.filter((i) => i._journal.content_status === 'ok').length;

			const doc = buildFeedDocument(source.name || source.id, enriched);
			validateFeedDocument(doc, { path: `data/feeds/${source.id}.json` });
			await Bun.write(join(PATHS.feedsDir, `${source.id}.json`), JSON.stringify(doc, null, 2));
			if (items.length > 0) {
				snapshots.push(enriched);
				authoritativeSourceIds.add(source.id);
			}

			job.state = 'succeeded';
			job.finished_at = new Date().toISOString();
			console.log(`[ok] ${source.id}: found=${job.items_found} downloaded=${job.items_downloaded}`);
		} catch (err) {
			job.state = 'failed';
			job.error = err instanceof Error ? err.message : String(err);
			job.finished_at = new Date().toISOString();
			console.error(`[fail] ${source.id}: ${job.error}`);
		}
	}

	const existingUnified = await loadExistingUnifiedItems();
	const retainedExisting = existingUnified.filter((item) =>
		shouldRetainExistingItem(item, {
			catalog,
			enabledSourceIds,
			authoritativeSourceIds
		})
	);
	const merged = mergeFeeds(retainedExisting, ...snapshots);
	const unified = buildFeedDocument('Journal', merged);
	unified.feed_url = '/data/feeds/unified.json';
	validateFeedDocument(unified, { path: 'data/feeds/unified.json' });
	await Bun.write(PATHS.unified, JSON.stringify(unified, null, 2));

	const anyOk = jobs.some((j) => j.state === 'succeeded');
	const prev = await loadStatus();
	const status = {
		last_refresh_at: anyOk ? new Date().toISOString() : prev.last_refresh_at,
		jobs
	};
	validateStatusDocument(status);
	await Bun.write(PATHS.status, JSON.stringify(status, null, 2));

	return { jobs, itemCount: merged.length };
}

async function loadExistingUnifiedItems() {
	try {
		const file = Bun.file(PATHS.unified);
		if (!(await file.exists())) return [];
		const doc = await file.json();
		validateFeedDocument(doc, { path: 'data/feeds/unified.json' });
		return Array.isArray(doc.items) ? doc.items : [];
	} catch {
		return [];
	}
}

async function loadStatus() {
	try {
		const file = Bun.file(PATHS.status);
		if (!(await file.exists())) return { last_refresh_at: null, jobs: [] };
		return validateStatusDocument(await file.json());
	} catch {
		return { last_refresh_at: null, jobs: [] };
	}
}

/**
 * Keep previous items only for enabled sources that were not replaced by this run.
 * @param {import('./feed.js').FeedItem} item
 * @param {{ catalog: any, enabledSourceIds: Set<string>, authoritativeSourceIds: Set<string> }} opts
 */
export function shouldRetainExistingItem(item, opts) {
	const sourceId = item?._journal?.source_id;
	if (!sourceId || !opts.enabledSourceIds.has(sourceId)) return false;
	if (opts.authoritativeSourceIds.has(sourceId)) return false;
	return isWithinRetention(item, retentionDaysForSource(sourceId, opts.catalog));
}

/**
 * @param {string} sourceId
 * @param {{ retention_days?: number, sources?: any[] }} catalog
 */
export function retentionDaysForSource(sourceId, catalog) {
	const source = (catalog.sources || []).find((s) => s.id === sourceId);
	return source?.retention_days || catalog.retention_days || DEFAULT_RETENTION_DAYS;
}

/**
 * @param {import('./feed.js').FeedItem} item
 * @param {number} days
 */
export function isWithinRetention(item, days) {
	const anchor =
		Date.parse(item.date_published || '') ||
		Date.parse(item.date_modified || '') ||
		Date.parse(item._journal?.ingested_at || '');
	if (!Number.isFinite(anchor)) return false;
	return Date.now() - anchor <= days * 24 * 60 * 60 * 1000;
}
