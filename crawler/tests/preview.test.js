import { describe, expect, test } from 'bun:test';
import {
	decodeEntities,
	editionReference,
	firstImageFromHtml,
	formatPublishedDate,
	highlightItems,
	isAiItem,
	isFreshItem,
	itemBadges,
	itemImage,
	itemLead,
	classifyTopic,
	topicSections,
	isDesignItem,
	filterByTopic,
	topicTabs,
	sourceTopicMap,
	sourceLabel,
	truncateAtWord
} from '../../app/src/lib/preview.js';

describe('card image', () => {
	test('prefers the crawled image field', () => {
		const item = {
			image: 'https://cdn.example.com/capa.jpg',
			content_html: '<img src="https://cdn.example.com/outra.jpg">'
		};
		expect(itemImage(item)).toBe('https://cdn.example.com/capa.jpg');
	});

	test('falls back to the first body image', () => {
		const html = '<p>Texto</p><img decoding="async" src="https://cdn.example.com/foto.png" alt="x">';
		expect(itemImage({ content_html: html })).toBe('https://cdn.example.com/foto.png');
	});

	test('skips logos, icons and theme assets', () => {
		const html =
			'<img src="https://site.com/wp-content/themes/tb/img/ml.png"><img src="https://site.com/logo-canaltech.svg"><img src="https://site.com/uploads/2026/07/materia.jpg">';
		expect(firstImageFromHtml(html)).toBe('https://site.com/uploads/2026/07/materia.jpg');
	});

	test('accepts lazy-loaded and srcset images', () => {
		expect(firstImageFromHtml('<img data-src="https://cdn.example.com/lazy.jpg">')).toBe(
			'https://cdn.example.com/lazy.jpg'
		);
		expect(
			firstImageFromHtml(
				'<img srcset="https://cdn.example.com/p-300.jpg 300w, https://cdn.example.com/p-1200.jpg 1200w">'
			)
		).toBe('https://cdn.example.com/p-1200.jpg');
	});

	test('returns null when there is no usable image', () => {
		expect(itemImage({ content_html: '<p>Só texto</p>' })).toBeNull();
		expect(itemImage(null)).toBeNull();
	});
});

describe('card lead', () => {
	test('uses the feed summary and drops the repeated headline', () => {
		const item = {
			title: 'Amazon faz cortes em IA',
			summary: 'Funcionários da divisão de AGI deixaram seus cargos nesta semana. Amazon faz cortes em IA'
		};
		expect(itemLead(item)).toBe('Funcionários da divisão de AGI deixaram seus cargos nesta semana.');
	});

	test('falls back to the first substantial paragraph', () => {
		const item = {
			content_html:
				'<figure><figcaption>Foto: divulgação</figcaption></figure><p>Curto.</p><p>A empresa confirmou as saídas nesta quinta-feira, mas não revelou quantos funcionários foram afetados pela decisão.</p>'
		};
		expect(itemLead(item)).toBe(
			'A empresa confirmou as saídas nesta quinta-feira, mas não revelou quantos funcionários foram afetados pela decisão.'
		);
	});

	test('falls back to content_text when there is no markup', () => {
		const item = { content_text: 'Texto corrido sem marcação alguma vindo direto do feed original.' };
		expect(itemLead(item)).toBe('Texto corrido sem marcação alguma vindo direto do feed original.');
	});

	test('truncates on a word boundary', () => {
		expect(truncateAtWord('uma frase bastante longa para cortar', 14)).toBe('uma frase…');
		expect(decodeEntities('promo&ccedil;&otilde;es &amp; ofertas')).toBe('promoções & ofertas');
	});

	test('every item ends up with a lead', () => {
		const items = [
			{ summary: 'a'.repeat(80) },
			{ content_html: `<p>${'b'.repeat(120)}</p>` },
			{ content_text: 'c'.repeat(90) }
		];
		for (const item of items) expect(itemLead(item).length).toBeGreaterThan(0);
	});
});

describe('highlights', () => {
	const reference = '2026-07-23T12:00:00.000Z';
	const aiItem = {
		id: 'ai',
		title: 'Anthropic lança novo modelo',
		date_published: '2026-07-01T10:00:00.000Z'
	};
	const freshItem = {
		id: 'fresh',
		title: 'Pix ganha novo limite',
		date_published: '2026-07-23T08:00:00.000Z'
	};
	const oldItem = {
		id: 'old',
		title: 'Retrospectiva dos consoles',
		date_published: '2026-05-02T08:00:00.000Z'
	};

	test('detects AI stories by term and acronym', () => {
		expect(isAiItem(aiItem)).toBe(true);
		expect(isAiItem({ title: 'Startup usa IA para triagem' })).toBe(true);
		expect(isAiItem({ title: 'Novo recurso', content_text: 'inteligência artificial no app' })).toBe(
			true
		);
		expect(isAiItem(oldItem)).toBe(false);
	});

	test('marks items published within the window as fresh', () => {
		expect(isFreshItem(freshItem, reference)).toBe(true);
		expect(isFreshItem(oldItem, reference)).toBe(false);
		expect(isFreshItem({ date_published: null }, reference)).toBe(false);
	});

	test('badges list AI first, then freshness', () => {
		const both = { title: 'OpenAI anuncia', date_published: reference };
		expect(itemBadges(both, { reference }).map((b) => b.id)).toEqual(['ai', 'fresh']);
		expect(itemBadges(oldItem, { reference })).toEqual([]);
	});

	test('picks AI stories before merely recent ones', () => {
		const picks = highlightItems([oldItem, freshItem, aiItem], { reference, limit: 2 });
		expect(picks.map((i) => i.id)).toEqual(['ai', 'fresh']);
	});

	test('edition reference is the newest publication date', () => {
		expect(editionReference([oldItem, aiItem, freshItem])).toBe(freshItem.date_published);
		expect(editionReference([])).toBeNull();
	});
});

describe('topics', () => {
	test('IA wins over other signals', () => {
		expect(classifyTopic({ title: 'Anthropic lança modelo na nuvem' })).toBe('ia');
	});

	test('classifies corporate IT, consumer and games', () => {
		expect(classifyTopic({ title: 'Data center da AWS sofre ataque hacker' })).toBe('ti');
		expect(classifyTopic({ title: 'Garmin Forerunner 55 tem desconto no Mercado Livre' })).toBe(
			'consumo'
		);
		expect(classifyTopic({ title: 'Fã lança port de Gears of War 2 para PC' })).toBe('outros');
	});

	test('unmatched stories fall into outros', () => {
		expect(classifyTopic({ title: 'Uma nota qualquer sobre nada específico' })).toBe('outros');
		expect(classifyTopic(null)).toBe('outros');
	});

	test('sections come back in display order, TI first, empty dropped', () => {
		const items = [
			{ id: 'a', title: 'Nuvem corporativa cresce', date_published: '2026-07-20T00:00:00Z' },
			{ id: 'b', title: 'OpenAI lança recurso', date_published: '2026-07-22T00:00:00Z' },
			{ id: 'c', title: 'Novo iPhone tem câmera melhor', date_published: '2026-07-21T00:00:00Z' }
		];
		const sections = topicSections(items);
		expect(sections.map((s) => s.id)).toEqual(['ti', 'ia', 'consumo']);
		expect(sections[0].total).toBe(1);
	});

	test('detects and routes design/UX stories', () => {
		expect(isDesignItem({ title: 'Melhorando a usabilidade com design system' })).toBe(true);
		expect(isDesignItem({ title: 'Preço do novo notebook cai' })).toBe(false);
		expect(classifyTopic({ title: 'Guia de user research para UX' })).toBe('design');
	});

	test('source topic hint decides sources with a known beat', () => {
		const sourceTopics = sourceTopicMap([
			{ id: 'src_nng', topic: 'design' },
			{ id: 'src_venturebeat_ai', topic: 'ia' }
		]);
		// generic title, but the source is a design publication
		expect(
			classifyTopic({ title: 'Novidades da semana', _journal: { source_id: 'src_nng' } }, { sourceTopics })
		).toBe('design');
		// AI keyword still wins over the source hint
		expect(
			classifyTopic(
				{ title: 'Como aplicar machine learning', _journal: { source_id: 'src_nng' } },
				{ sourceTopics }
			)
		).toBe('ia');
	});

	test('filterByTopic and topicTabs respect todos + hints', () => {
		const sourceTopics = sourceTopicMap([{ id: 'src_nng', topic: 'design' }]);
		const items = [
			{ id: 'd', title: 'Semana no NN/g', _journal: { source_id: 'src_nng' } },
			{ id: 'a', title: 'OpenAI lança recurso', _journal: { source_id: 'src_x' } },
			{ id: 't', title: 'Data center e nuvem hacker', _journal: { source_id: 'src_x' } }
		];
		expect(filterByTopic(items, 'todos', { sourceTopics }).length).toBe(3);
		expect(filterByTopic(items, 'design', { sourceTopics }).map((i) => i.id)).toEqual(['d']);
		const tabs = topicTabs(items, { sourceTopics });
		expect(tabs[0]).toEqual({ id: 'todos', label: 'Todos', count: 3 });
		expect(tabs.map((t) => t.id)).toEqual(['todos', 'design', 'ti', 'ia']);
	});

	test('perTopic caps items but keeps the true total', () => {
		const items = Array.from({ length: 5 }, (_, i) => ({
			id: `t${i}`,
			title: 'Data center e nuvem',
			date_published: `2026-07-${10 + i}T00:00:00Z`
		}));
		const [ti] = topicSections(items, { perTopic: 2 });
		expect(ti.items.length).toBe(2);
		expect(ti.total).toBe(5);
		// newest first
		expect(ti.items[0].id).toBe('t4');
	});
});

describe('meta line', () => {
	test('formats the publication date in pt-BR', () => {
		expect(formatPublishedDate('2026-07-23T12:00:00.000Z')).toMatch(/2026/);
		expect(formatPublishedDate('')).toBe('');
		expect(formatPublishedDate('not-a-date')).toBe('');
	});

	test('resolves the source name from the catalog', () => {
		const sources = [{ id: 'src_tecnoblog', name: 'Tecnoblog' }];
		expect(sourceLabel('src_tecnoblog', sources)).toBe('Tecnoblog');
		expect(sourceLabel('src_convergencia_feed', sources)).toBe('convergencia feed');
	});
});
