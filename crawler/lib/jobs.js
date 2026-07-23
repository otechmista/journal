import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PATHS } from './paths.js';
import { buildFeedDocument, mergeFeeds } from './feed.js';
import { fetchAndParseRss } from './rss.js';
import { scrapeSource } from './scrape.js';
import { enrichItems } from './article.js';
import { getEnabledSources } from './sources.js';

/**
 * @param {{ sourceId?: string, saveSnapshot?: boolean, maxArticles?: number }} [opts]
 */
export async function runCrawl(opts = {}) {
	await mkdir(PATHS.feedsDir, { recursive: true });

	const sources = await getEnabledSources(opts.sourceId);
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
			error: null
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
			const limited = opts.maxArticles ? items.slice(0, opts.maxArticles) : items;
			const delayMs = source.crawl?.delay_ms ?? 400;
			const enriched = await enrichItems(limited, {
				delayMs,
				saveSnapshot: opts.saveSnapshot === true
			});
			job.items_downloaded = enriched.filter((i) => i._journal.content_status === 'ok').length;

			const doc = buildFeedDocument(source.name || source.id, enriched);
			await Bun.write(join(PATHS.feedsDir, `${source.id}.json`), JSON.stringify(doc, null, 2));
			snapshots.push(enriched);

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
	const merged = mergeFeeds(existingUnified, ...snapshots);
	const unified = buildFeedDocument('Journal', merged);
	unified.feed_url = '/data/feeds/unified.json';
	await Bun.write(PATHS.unified, JSON.stringify(unified, null, 2));

	const anyOk = jobs.some((j) => j.state === 'succeeded');
	const prev = await loadStatus();
	const status = {
		last_refresh_at: anyOk ? new Date().toISOString() : prev.last_refresh_at,
		jobs
	};
	await Bun.write(PATHS.status, JSON.stringify(status, null, 2));

	return { jobs, itemCount: merged.length };
}

async function loadExistingUnifiedItems() {
	try {
		const file = Bun.file(PATHS.unified);
		if (!(await file.exists())) return [];
		const doc = await file.json();
		return Array.isArray(doc.items) ? doc.items : [];
	} catch {
		return [];
	}
}

async function loadStatus() {
	try {
		const file = Bun.file(PATHS.status);
		if (!(await file.exists())) return { last_refresh_at: null, jobs: [] };
		return file.json();
	} catch {
		return { last_refresh_at: null, jobs: [] };
	}
}
