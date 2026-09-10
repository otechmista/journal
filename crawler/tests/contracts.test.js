import { describe, expect, test } from 'bun:test';
import {
	validateFeedDocument,
	validateSourcesCatalog,
	validateStatusDocument
} from '../../shared/contracts.js';

describe('public JSON contracts', () => {
	test('accepts the current sources catalog shape including retention_days', () => {
		expect(
			validateSourcesCatalog({
				version: 1,
				retention_days: 14,
				sources: [
					{
						id: 'src_test',
						name: 'Test',
						type: 'rss',
						enabled: true,
						url: 'https://example.com/feed.xml'
					},
					{
						id: 'src_scrape',
						name: 'Scrape',
						type: 'scrape',
						enabled: false,
						url: 'https://example.com/',
						selectors: { item: 'article', title: 'a', link: 'a@href' }
					}
				]
			}).sources
		).toHaveLength(2);
	});

	test('rejects invalid source URLs and duplicate IDs', () => {
		expect(() =>
			validateSourcesCatalog({
				sources: [
					{ id: 'x', name: 'One', type: 'rss', enabled: true, url: 'file:///tmp/feed.xml' },
					{ id: 'x', name: 'Two', type: 'rss', enabled: true, url: 'https://example.com/feed.xml' }
				]
			})
		).toThrow(/duplicates|http/);
	});

	test('accepts feed items with required journal metadata', () => {
		const doc = {
			version: 'https://jsonfeed.org/version/1.1',
			title: 'Journal',
			items: [
				{
					id: 'https://example.com/a',
					url: 'https://example.com/a',
					title: 'A',
					date_published: '2026-09-09T10:00:00.000Z',
					_journal: {
						source_id: 'src_test',
						source_type: 'rss',
						ingested_at: '2026-09-09T10:01:00.000Z',
						content_status: 'ok'
					}
				}
			]
		};
		expect(validateFeedDocument(doc, { path: 'unified.json' }).items).toHaveLength(1);
	});

	test('rejects feed items without http URLs or _journal status', () => {
		expect(() =>
			validateFeedDocument({
				items: [
					{
						id: 'urn:1',
						url: 'urn:1',
						title: 'Bad',
						_journal: { source_id: 's', source_type: 'rss', ingested_at: 'bad', content_status: 'done' }
					}
				]
			})
		).toThrow(/url|content_status|ingested_at/);
	});

	test('accepts crawler job warnings in status.json', () => {
		const doc = {
			last_refresh_at: '2026-09-09T10:00:00.000Z',
			jobs: [
				{
					id: 'job_src_empty_1',
					source_id: 'src_empty',
					state: 'succeeded',
					started_at: '2026-09-09T09:59:00.000Z',
					finished_at: '2026-09-09T10:00:00.000Z',
					items_found: 0,
					items_downloaded: 0,
					error: null,
					warning: 'No items found'
				}
			]
		};
		expect(validateStatusDocument(doc).jobs[0].warning).toBe('No items found');
	});
});
