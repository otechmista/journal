import { describe, expect, test } from 'bun:test';
import { filterItems, paginateItems, pageWindow, normalizeQuery } from '../../app/src/lib/edition.js';

describe('edition search/pagination', () => {
	const items = [
		{ id: '1', title: 'Galaxy S26 chega ao Brasil', summary: 'Samsung lança', _journal: { source_id: 'src_tecnoblog' } },
		{ id: '2', title: 'OpenAI anuncia modelo', content_text: 'inteligência artificial', _journal: { source_id: 'src_canaltech' } },
		{ id: '3', title: 'Pix na Samsung Wallet', summary: 'pagamentos', _journal: { source_id: 'src_canaltech' } }
	];

	test('normalizeQuery strips accents', () => {
		expect(normalizeQuery('Informação')).toBe('informacao');
	});

	test('filterItems matches title and source tokens', () => {
		expect(filterItems(items, 'galaxy brasil').map((i) => i.id)).toEqual(['1']);
		expect(filterItems(items, 'canaltech pix').map((i) => i.id)).toEqual(['3']);
		expect(filterItems(items, 'openai').map((i) => i.id)).toEqual(['2']);
	});

	test('paginateItems slices pages', () => {
		const page1 = paginateItems(items, 1, 2);
		expect(page1.items.map((i) => i.id)).toEqual(['1', '2']);
		expect(page1.totalPages).toBe(2);
		const page2 = paginateItems(items, 2, 2);
		expect(page2.items.map((i) => i.id)).toEqual(['3']);
		expect(page2.from).toBe(3);
		expect(page2.to).toBe(3);
	});

	test('pageWindow includes edges', () => {
		expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
		expect(pageWindow(5, 10)).toContain(1);
		expect(pageWindow(5, 10)).toContain(10);
		expect(pageWindow(5, 10)).toContain('…');
	});
});
