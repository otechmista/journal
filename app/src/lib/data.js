/**
 * Public JSON data access — no application API.
 * User annotations live in localStorage (see annotations.js).
 */
import { base } from '$app/paths';

function withBase(path) {
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${base}${p}`;
}

function bust(path) {
	const full = withBase(path);
	const sep = full.includes('?') ? '&' : '?';
	return `${full}${sep}t=${Date.now()}`;
}

async function getJson(path) {
	const res = await fetch(bust(path));
	if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
	return res.json();
}

export async function loadEdition() {
	const [feed, status, sources] = await Promise.all([
		getJson('/data/feeds/unified.json'),
		getJson('/data/jobs/status.json'),
		getJson('/data/sources.json')
	]);
	return { feed, status, sources };
}

export { withBase };
