/** Site identity for SEO, Open Graph, and absolute URLs. */
export const SITE = {
	name: 'Journal',
	tagline: 'Edição pública de notícias',
	description:
		'Notícias de tecnologia reunidas num só lugar — edição pública em JSON, leitura no estilo jornal impresso.',
	locale: 'pt_BR',
	language: 'pt-BR',
	/** Canonical origin (custom domain). Override with PUBLIC_SITE_URL at build. */
	origin: 'https://journal.camilomelo.com',
	ogImagePath: '/og-default.jpg',
	twitterHandle: ''
};
/**
 * @param {string} [override]
 */
export function siteOrigin(override) {
	let fromEnv = '';
	try {
		if (import.meta.env && import.meta.env.PUBLIC_SITE_URL) {
			fromEnv = String(import.meta.env.PUBLIC_SITE_URL).replace(/\/$/, '');
		}
	} catch {
		/* ignore */
	}
	return (override || fromEnv || SITE.origin).replace(/\/$/, '');
}

/**
 * Absolute URL for a path (with optional SvelteKit base).
 * @param {string} path
 * @param {{ base?: string, origin?: string }} [opts]
 */
export function absoluteUrl(path, opts = {}) {
	const origin = siteOrigin(opts.origin);
	let base = opts.base || '';
	// Relative kit builds expose base as "." — not valid in absolute SEO URLs
	if (base === '.' || base === './') base = '';
	base = base.replace(/\/$/, '');
	const p = path.startsWith('/') ? path : `/${path}`;
	if (p === '/') return `${origin}/`;
	const joined = `${base}${p}`.replace(/\/{2,}/g, '/');
	return `${origin}${joined.startsWith('/') ? joined : `/${joined}`}`;
}

/**
 * @param {string} text
 * @param {number} [max]
 */
export function truncateMeta(text, max = 160) {
	const t = String(text || '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1).trim()}…`;
}
