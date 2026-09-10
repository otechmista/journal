import { describe, expect, test } from 'bun:test';
import {
	isWithinRetention,
	retentionDaysForSource,
	shouldRetainExistingItem
} from '../lib/jobs.js';

function item(sourceId, iso) {
	return {
		id: `https://example.com/${sourceId}/${iso}`,
		url: `https://example.com/${sourceId}/${iso}`,
		title: 'Story',
		date_published: iso,
		_journal: {
			source_id: sourceId,
			source_type: 'rss',
			ingested_at: iso,
			content_status: 'ok'
		}
	};
}

describe('unified feed retention', () => {
	test('uses source retention_days before catalog default', () => {
		const catalog = {
			retention_days: 14,
			sources: [{ id: 'src_short', retention_days: 3 }]
		};
		expect(retentionDaysForSource('src_short', catalog)).toBe(3);
		expect(retentionDaysForSource('src_other', catalog)).toBe(14);
	});

	test('keeps only items inside the retention window', () => {
		const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
		const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
		expect(isWithinRetention(item('src_a', recent), 14)).toBe(true);
		expect(isWithinRetention(item('src_a', old), 14)).toBe(false);
	});

	test('drops disabled sources and sources replaced by a successful crawl', () => {
		const catalog = {
			retention_days: 14,
			sources: [
				{ id: 'src_active', enabled: true },
				{ id: 'src_replaced', enabled: true },
				{ id: 'src_disabled', enabled: false }
			]
		};
		const recent = new Date().toISOString();
		const opts = {
			catalog,
			enabledSourceIds: new Set(['src_active', 'src_replaced']),
			authoritativeSourceIds: new Set(['src_replaced'])
		};
		expect(shouldRetainExistingItem(item('src_active', recent), opts)).toBe(true);
		expect(shouldRetainExistingItem(item('src_replaced', recent), opts)).toBe(false);
		expect(shouldRetainExistingItem(item('src_disabled', recent), opts)).toBe(false);
	});
});
