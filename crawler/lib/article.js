import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { PATHS, sleep } from './paths.js';

/**
 * Download full article body into the item.
 * @param {import('./feed.js').FeedItem} item
 * @param {{ delayMs?: number, saveSnapshot?: boolean }} [opts]
 */
export async function enrichItemWithArticle(item, opts = {}) {
	const delayMs = opts.delayMs ?? 400;
	try {
		if (item.content_html && item.content_html.length > 400) {
			item._journal.content_status = 'ok';
			item._journal.content_error = null;
			if (!item.content_text) item.content_text = stripTags(item.content_html);
			return item;
		}

		const res = await fetch(item.url, {
			headers: { 'User-Agent': 'JournalCrawler/0.1 (+https://local.journal)' }
		});
		if (!res.ok) {
			item._journal.content_status = 'error';
			item._journal.content_error = `Article fetch failed ${res.status}`;
			return item;
		}
		const html = await res.text();

		if (opts.saveSnapshot) {
			await mkdir(PATHS.articlesDir, { recursive: true });
			const hash = createHash('sha1').update(item.url).digest('hex').slice(0, 16);
			const file = join(PATHS.articlesDir, `${hash}.html`);
			await Bun.write(file, html);
			item._journal.article_snapshot = `articles/${hash}.html`;
		}

		const { content_html, content_text, title } = extractReadable(html, item.url);
		if (!content_html && !content_text) {
			item._journal.content_status = 'error';
			item._journal.content_error = 'Could not extract main content';
			return item;
		}

		item.content_html = content_html || undefined;
		item.content_text = content_text || stripTags(content_html || '');
		if (!item.title && title) item.title = title;
		item._journal.content_status = 'ok';
		item._journal.content_error = null;
	} catch (err) {
		item._journal.content_status = 'error';
		item._journal.content_error = err instanceof Error ? err.message : String(err);
	}

	if (delayMs > 0) await sleep(delayMs);
	return item;
}

/**
 * @param {import('./feed.js').FeedItem[]} items
 * @param {{ delayMs?: number, saveSnapshot?: boolean }} [opts]
 */
export async function enrichItems(items, opts = {}) {
	const out = [];
	for (const item of items) {
		out.push(await enrichItemWithArticle(item, opts));
	}
	return out;
}

function extractReadable(html, url) {
	const { document } = parseHTML(html);
	try {
		Object.defineProperty(document, 'documentURI', { value: url });
	} catch {
		/* ignore */
	}
	const reader = new Readability(document);
	const article = reader.parse();
	if (!article) return { content_html: '', content_text: '', title: '' };
	return {
		content_html: article.content || '',
		content_text: article.textContent || stripTags(article.content || ''),
		title: article.title || ''
	};
}

function stripTags(s) {
	return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
