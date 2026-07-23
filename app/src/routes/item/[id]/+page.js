import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEdition } from '$lib/data.js';
import { itemSlug, findBySlug } from '$lib/slug.js';

export const prerender = true;
export const ssr = true;

function readUnifiedItems() {
	const candidates = [
		join(process.cwd(), 'static/data/feeds/unified.json'),
		join(process.cwd(), '../data/feeds/unified.json')
	];
	for (const file of candidates) {
		if (!existsSync(file)) continue;
		try {
			const doc = JSON.parse(readFileSync(file, 'utf8'));
			return Array.isArray(doc.items) ? doc.items : [];
		} catch {
			/* try next */
		}
	}
	return [];
}

/** @type {import('./$types').EntryGenerator} */
export function entries() {
	const seen = new Set();
	const out = [];
	for (const item of readUnifiedItems()) {
		const slug = itemSlug(item.id);
		if (seen.has(slug)) continue;
		seen.add(slug);
		out.push({ id: slug });
	}
	return out;
}

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const slug = params.id;
	try {
		const { feed, status } = await loadEdition(fetch);
		const item = findBySlug(feed.items || [], slug);
		return {
			item,
			status,
			notFound: !item
		};
	} catch (err) {
		return {
			item: null,
			status: { last_refresh_at: null, jobs: [] },
			notFound: true,
			error: err instanceof Error ? err.message : String(err)
		};
	}
}
