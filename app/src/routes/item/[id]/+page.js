import { loadEdition } from '$lib/data.js';
import { findBySlug } from '$lib/slug.js';

export const prerender = true;
export const ssr = true;

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
