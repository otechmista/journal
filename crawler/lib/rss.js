import { XMLParser } from 'fast-xml-parser';
import { normalizeItem } from './feed.js';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	isArray: (name) => ['item', 'entry', 'author', 'link', 'category'].includes(name)
});

/**
 * @param {string} xml
 * @param {{ id: string, type: 'rss'|'scrape', name?: string }} source
 */
export function parseFeedXml(xml, source) {
	const doc = parser.parse(xml);
	if (doc.rss || doc.RDF || doc['rdf:RDF']) {
		return parseRss(doc, source);
	}
	if (doc.feed) {
		return parseAtom(doc.feed, source);
	}
	throw new Error('Unrecognized feed format (expected RSS or Atom)');
}

/**
 * @param {string} url
 * @param {{ id: string, type: 'rss'|'scrape', name?: string }} source
 */
export async function fetchAndParseRss(url, source) {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'JournalCrawler/0.1 (+https://local.journal)' }
	});
	if (!res.ok) throw new Error(`RSS fetch failed ${res.status} for ${url}`);
	const xml = await res.text();
	return parseFeedXml(xml, source);
}

function asArray(v) {
	if (v == null) return [];
	return Array.isArray(v) ? v : [v];
}

function textOf(node) {
	if (node == null) return '';
	if (typeof node === 'string' || typeof node === 'number') return String(node);
	if (typeof node === 'object') {
		if (node['#text'] != null) return String(node['#text']);
		if (node['@_href']) return String(node['@_href']);
	}
	return '';
}

function parseRss(doc, source) {
	const channel = doc.rss?.channel || doc.RDF?.channel || doc['rdf:RDF']?.channel || {};
	const items = asArray(channel.item || doc.RDF?.item || doc['rdf:RDF']?.item);
	const out = [];
	for (const item of items) {
		const link = textOf(item.link) || textOf(item.guid);
		const guid = textOf(item.guid) || link;
		const contentHtml =
			textOf(item['content:encoded']) ||
			textOf(item.content) ||
			textOf(item.description);
		const summary = textOf(item.description) || textOf(item.summary);
		const normalized = normalizeItem(
			{
				id: guid,
				url: link,
				title: textOf(item.title),
				summary: summary && summary !== contentHtml ? stripTags(summary).slice(0, 500) : undefined,
				content_html: looksLikeHtml(contentHtml) ? contentHtml : undefined,
				content_text: !looksLikeHtml(contentHtml) && contentHtml ? contentHtml : undefined,
				date_published: parseDate(textOf(item.pubDate) || textOf(item['dc:date'])),
				authors: item['dc:creator'] ? [{ name: textOf(item['dc:creator']) }] : undefined
			},
			{ source_id: source.id, source_type: 'rss' }
		);
		if (normalized) out.push(normalized);
	}
	return out;
}

function parseAtom(feed, source) {
	const entries = asArray(feed.entry);
	const out = [];
	for (const entry of entries) {
		const links = asArray(entry.link);
		const alt =
			links.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate') || links[0];
		const url = alt?.['@_href'] || textOf(alt) || textOf(entry.id);
		const content = entry.content;
		const contentHtml =
			typeof content === 'object'
				? textOf(content)
				: textOf(content) || textOf(entry.summary);
		const normalized = normalizeItem(
			{
				id: textOf(entry.id) || url,
				url,
				title: textOf(entry.title),
				summary: textOf(entry.summary) ? stripTags(textOf(entry.summary)).slice(0, 500) : undefined,
				content_html: looksLikeHtml(contentHtml) ? contentHtml : undefined,
				content_text: !looksLikeHtml(contentHtml) && contentHtml ? contentHtml : undefined,
				date_published: parseDate(textOf(entry.published) || textOf(entry.updated)),
				authors: asArray(entry.author)
					.map((a) => ({ name: textOf(a.name) || textOf(a) }))
					.filter((a) => a.name)
			},
			{ source_id: source.id, source_type: 'rss' }
		);
		if (normalized) out.push(normalized);
	}
	return out;
}

function looksLikeHtml(s) {
	return typeof s === 'string' && /<[a-z][\s\S]*>/i.test(s);
}

function stripTags(s) {
	return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseDate(s) {
	if (!s) return undefined;
	const t = Date.parse(s);
	if (Number.isNaN(t)) return undefined;
	return new Date(t).toISOString();
}
