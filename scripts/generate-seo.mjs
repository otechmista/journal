#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFeedDocument } from '../shared/contracts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STATIC = join(ROOT, 'app', 'static');
const DATA = join(ROOT, 'data', 'feeds', 'unified.json');

const origin = (await siteOrigin()).replace(/\/$/, '');
await mkdir(STATIC, { recursive: true });

await writeFile(
	join(STATIC, 'robots.txt'),
	`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
	'utf8'
);

const items = await readItems();
const seen = new Set();
const lines = [
	'<?xml version="1.0" encoding="UTF-8"?>',
	'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
	`  <url><loc>${xmlEscape(origin)}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`
];

for (const item of items) {
	const slug = itemSlug(item.id);
	if (seen.has(slug)) continue;
	seen.add(slug);
	lines.push('  <url>');
	lines.push(`    <loc>${xmlEscape(`${origin}/item/${slug}`)}</loc>`);
	const lastmod = String(item.date_modified || item.date_published || '').slice(0, 10);
	if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`);
	lines.push('    <changefreq>daily</changefreq>');
	lines.push('    <priority>0.7</priority>');
	lines.push('  </url>');
}

lines.push('</urlset>');
await writeFile(join(STATIC, 'sitemap.xml'), `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote robots.txt + sitemap.xml -> ${origin} (${seen.size} items)`);

async function siteOrigin() {
	if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL;
	const cname = join(STATIC, 'CNAME');
	if (existsSync(cname)) {
		const value = (await readFile(cname, 'utf8')).trim();
		if (value) return `https://${value}`;
	}
	return 'https://journal.camilomelo.com';
}

async function readItems() {
	if (!existsSync(DATA)) return [];
	const doc = JSON.parse(await readFile(DATA, 'utf8'));
	return validateFeedDocument(doc, { path: 'data/feeds/unified.json' }).items || [];
}

/**
 * Keep this in sync with app/src/lib/slug.js.
 * @param {string} id
 */
function itemSlug(id) {
	const s = String(id || '');
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return `${(h >>> 0).toString(16).padStart(8, '0')}${s.length.toString(16)}`;
}

/**
 * @param {string} value
 */
function xmlEscape(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
