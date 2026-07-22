import * as cheerio from 'cheerio';
import { normalizeItem } from './feed.js';
import { absoluteUrl, sameOrigin, sleep } from './paths.js';

/**
 * Parse `selector` or `selector@attr`.
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').AnyNode} el
 * @param {string} rule
 */
function extractField($, el, rule) {
	if (!rule || rule === '[TO CALIBRATE]') return '';
	const [sel, attr] = rule.split('@');
	const node = sel ? $(el).find(sel).first() : $(el);
	if (!node.length) return '';
	if (attr) return (node.attr(attr) || '').trim();
	return node.text().trim();
}

/**
 * @param {string} html
 * @param {{ id: string, url: string, selectors: Record<string,string>, crawl?: object, name?: string }} source
 */
export function extractListing(html, source) {
	const $ = cheerio.load(html);
	const sel = source.selectors || {};
	if (!sel.item || sel.item === '[TO CALIBRATE]') {
		throw new Error(`Selectors not calibrated for source ${source.id}`);
	}

	/** @type {import('./feed.js').FeedItem[]} */
	const items = [];
	$(sel.item).each((_, el) => {
		const title =
			extractField($, el, sel.title) ||
			$(el).find('a[href]').first().attr('title') ||
			$(el).find('a[href]').first().text().trim();
		let link = extractField($, el, sel.link);
		if (!link) {
			const a = $(el).find('a[href]').first();
			link = a.attr('href') || '';
		}
		const url = absoluteUrl(link, source.url);
		if (!url || !title) return;
		const summary = sel.summary ? extractField($, el, sel.summary) : '';
		const dateRaw = sel.date ? extractField($, el, sel.date) : '';
		const image = sel.image ? absoluteUrl(extractField($, el, sel.image), source.url) : undefined;
		const date_published = dateRaw ? tryIso(dateRaw) : undefined;
		const item = normalizeItem(
			{
				url,
				id: url,
				title,
				summary: summary || undefined,
				image: image || undefined,
				date_published
			},
			{ source_id: source.id, source_type: 'scrape' }
		);
		if (item) items.push(item);
	});
	return items;
}

/**
 * @param {{ id: string, url: string, selectors: Record<string,string>, crawl?: object }} source
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function scrapeSource(source, opts = {}) {
	const crawl = source.crawl || {};
	const maxPages = crawl.max_pages ?? 20;
	const delayMs = crawl.delay_ms ?? 500;
	const sameOriginOnly = crawl.same_origin_only !== false;
	const depth = crawl.depth ?? 1;

	/** @type {Map<string, import('./feed.js').FeedItem>} */
	const found = new Map();
	/** @type {{ url: string, depth: number }[]} */
	const queue = [{ url: source.url, depth: 0 }];
	const visited = new Set();
	let pages = 0;

	while (queue.length && pages < maxPages) {
		if (opts.signal?.aborted) break;
		const next = queue.shift();
		if (!next || visited.has(next.url)) continue;
		visited.add(next.url);

		const res = await fetch(next.url, {
			headers: { 'User-Agent': 'JournalCrawler/0.1 (+https://local.journal)' },
			signal: opts.signal
		});
		if (!res.ok) {
			if (pages === 0) throw new Error(`Listing fetch failed ${res.status} for ${next.url}`);
			continue;
		}
		const html = await res.text();
		pages += 1;

		const items = extractListing(html, source);
		for (const item of items) found.set(item.id, item);

		if (next.depth + 1 < depth) {
			const $ = cheerio.load(html);
			$('a[href]').each((_, a) => {
				const href = absoluteUrl($(a).attr('href'), next.url);
				if (!href) return;
				if (sameOriginOnly && !sameOrigin(href, source.url)) return;
				if (!visited.has(href)) queue.push({ url: href, depth: next.depth + 1 });
			});
		}

		if (queue.length && delayMs > 0) await sleep(delayMs);
	}

	return { items: [...found.values()], pagesDone: pages };
}

function tryIso(s) {
	const t = Date.parse(s);
	if (Number.isNaN(t)) return undefined;
	return new Date(t).toISOString();
}
