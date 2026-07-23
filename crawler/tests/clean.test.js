import { describe, expect, test } from 'bun:test';
import { cleanContentHtml, cleanContentText } from '../lib/clean.js';

describe('cleanContent', () => {
	test('removes WhatsApp channel promo list item', () => {
		const html = `<p>Intro ok.</p><ul><li><a href="https://www.whatsapp.com/channel/0029Va8w71Y9xVJhPriudt0q?utm_source=produtos">📱 Veja as melhores promoções de hoje no WhatsApp do CT Ofertas</a></li></ul><p>Continua.</p>`;
		const out = cleanContentHtml(html);
		expect(out).toContain('Intro ok');
		expect(out).toContain('Continua');
		expect(out).not.toMatch(/whatsapp\.com\/channel/i);
		expect(out).not.toMatch(/CT Ofertas/i);
	});

	test('removes Achados do TB WhatsApp Telegram phrase from text', () => {
		const text =
			'Ver preço Participe dos canais de ofertas do Achados do TB WhatsApp Telegram O Galaxy Buds 4 está disponível';
		expect(cleanContentText(text)).toBe('Ver preço O Galaxy Buds 4 está disponível');
	});

	test('removes CT Ofertas WhatsApp promo with HTML entities', () => {
		const text =
			'desempenho. Veja as melhores promo&ccedil;&otilde;es de smartwatches no WhatsApp do CT Ofertas Entre os destaques';
		expect(cleanContentText(text)).toBe('desempenho. Entre os destaques');
	});

	test('removes {{WHATSAPP_CHANNEL}} placeholder block', () => {
		const html = `<p>Fim da matéria.</p><p>{{WHATSAPP_CHANNEL}}</p>`;
		const out = cleanContentHtml(html);
		expect(out).toContain('Fim da matéria');
		expect(out).not.toMatch(/WHATSAPP_CHANNEL/);
	});
});
