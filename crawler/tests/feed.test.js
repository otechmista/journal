import { describe, expect, test } from 'bun:test';
import { normalizeItem, mergeFeeds, itemId, compareByDate } from '../lib/feed.js';
import { parseFeedXml } from '../lib/rss.js';
import { extractListing } from '../lib/scrape.js';

describe('feed', () => {
	test('itemId prefers id then url', () => {
		expect(itemId({ id: 'a', url: 'https://x' })).toBe('a');
		expect(itemId({ url: 'https://x' })).toBe('https://x');
	});

	test('mergeFeeds dedupes and prefers fuller content', () => {
		const a = normalizeItem(
			{ id: '1', url: 'https://ex/1', title: 'One', content_text: 'short' },
			{ source_id: 's1', source_type: 'rss' }
		);
		a._journal.content_status = 'ok';
		const b = normalizeItem(
			{
				id: '1',
				url: 'https://ex/1',
				title: 'One',
				content_html: '<p>longer body content here for article</p>',
				content_text: 'longer body content here for article'
			},
			{ source_id: 's1', source_type: 'rss' }
		);
		b._journal.content_status = 'ok';
		const merged = mergeFeeds([a], [b]);
		expect(merged).toHaveLength(1);
		expect(merged[0].content_html).toContain('longer');
	});

	test('sort puts dated items first', () => {
		const older = normalizeItem(
			{ url: 'https://a', title: 'A', date_published: '2020-01-01T00:00:00Z' },
			{ source_id: 's', source_type: 'rss' }
		);
		const newer = normalizeItem(
			{ url: 'https://b', title: 'B', date_published: '2024-01-01T00:00:00Z' },
			{ source_id: 's', source_type: 'rss' }
		);
		const undated = normalizeItem(
			{ url: 'https://c', title: 'C' },
			{ source_id: 's', source_type: 'rss' }
		);
		const sorted = [undated, older, newer].sort(compareByDate);
		expect(sorted[0].id).toBe('https://b');
		expect(sorted[1].id).toBe('https://a');
	});
});

describe('rss', () => {
	test('parses RSS 2.0 fixture', () => {
		const xml = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>T</title>
<item>
  <title>Hello</title>
  <link>https://example.com/hello</link>
  <guid>https://example.com/hello</guid>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
  <description>Deck</description>
</item>
</channel></rss>`;
		const items = parseFeedXml(xml, { id: 'src_test', type: 'rss' });
		expect(items).toHaveLength(1);
		expect(items[0].title).toBe('Hello');
		expect(items[0].url).toBe('https://example.com/hello');
		expect(items[0]._journal.source_id).toBe('src_test');
	});

	test('parses Atom fixture', () => {
		const xml = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>T</title>
  <entry>
    <id>urn:1</id>
    <title>Atom Hi</title>
    <link href="https://example.com/atom" rel="alternate"/>
    <published>2024-02-01T00:00:00Z</published>
    <summary>Sum</summary>
  </entry>
</feed>`;
		const items = parseFeedXml(xml, { id: 'src_atom', type: 'rss' });
		expect(items).toHaveLength(1);
		expect(items[0].title).toBe('Atom Hi');
		expect(items[0].url).toBe('https://example.com/atom');
	});
});

describe('scrape', () => {
	test('extractListing with selectors', () => {
		const html = `<html><body>
      <article class="card"><h2><a href="/p/1">Title One</a></h2><p class="excerpt">Deck</p></article>
      <article class="card"><h2><a href="/p/2">Title Two</a></h2></article>
    </body></html>`;
		const items = extractListing(html, {
			id: 'src_x',
			url: 'https://news.example/',
			selectors: {
				item: 'article.card',
				title: 'h2 a',
				link: 'h2 a@href',
				summary: 'p.excerpt'
			}
		});
		expect(items).toHaveLength(2);
		expect(items[0].url).toBe('https://news.example/p/1');
		expect(items[0].summary).toBe('Deck');
	});
});
