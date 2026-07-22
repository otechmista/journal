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
	const u = new URL(full, typeof window !== 'undefined' ? window.location.origin : 'http://local');
	u.searchParams.set('t', String(Date.now()));
	return u.pathname + u.search;
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
