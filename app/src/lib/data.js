/**
 * Public JSON data access — no application API.
 * User annotations live in localStorage (see annotations.js).
 */
import { base, resolve } from '$app/paths';

/**
 * Root-relative (or kit-base) path for public assets / JSON.
 * Treats relative kit `base` (`.` / `./`) as empty so fetches stay absolute.
 * @param {string} path
 */
function withBase(path) {
	const p = path.startsWith('/') ? path : `/${path}`;
	let root = base || '';
	if (root === '.' || root === './') root = '';
	root = root.replace(/\/$/, '');
	if (root) return `${root}${p}`;
	try {
		return resolve(p);
	} catch {
		return p;
	}
}

/**
 * @param {string} path
 * @param {typeof fetch} [fetcher]
 */
async function getJson(path, fetcher = fetch) {
	const res = await fetcher(withBase(path));
	if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
	return res.json();
}

/**
 * @param {typeof fetch} [fetcher]
 */
export async function loadEdition(fetcher = fetch) {
	const [feed, status, sources] = await Promise.all([
		getJson('/data/feeds/unified.json', fetcher),
		getJson('/data/jobs/status.json', fetcher),
		getJson('/data/sources.json', fetcher)
	]);
	return { feed, status, sources };
}

export { withBase };
