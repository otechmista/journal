import { loadEdition } from '$lib/data.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	try {
		return await loadEdition(fetch);
	} catch (err) {
		return {
			feed: { items: [] },
			status: { last_refresh_at: null, jobs: [] },
			sources: { sources: [] },
			error: err instanceof Error ? err.message : String(err)
		};
	}
}
