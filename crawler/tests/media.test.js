import { describe, expect, test } from 'bun:test';
import { mediaImage } from '../lib/rss.js';
import { extractSocialImage } from '../lib/article.js';

describe('feed media', () => {
	test('reads media:content', () => {
		expect(mediaImage({ 'media:content': { '@_url': 'https://x.com/a.jpg', '@_medium': 'image' } })).toBe(
			'https://x.com/a.jpg'
		);
	});

	test('reads image enclosures and ignores audio', () => {
		expect(mediaImage({ enclosure: { '@_url': 'https://x.com/a.png', '@_type': 'image/png' } })).toBe(
			'https://x.com/a.png'
		);
		expect(
			mediaImage({ enclosure: { '@_url': 'https://x.com/a.mp3', '@_type': 'audio/mpeg' } })
		).toBeUndefined();
	});

	test('ignores items without media', () => {
		expect(mediaImage({ title: 'sem imagem' })).toBeUndefined();
	});
});

describe('article social image', () => {
	test('reads og:image and resolves relative URLs', () => {
		const html = `<head><meta property="og:image" content="/img/capa.jpg"></head>`;
		expect(extractSocialImage(html, 'https://site.com/noticia/1')).toBe('https://site.com/img/capa.jpg');
	});

	test('falls back to twitter:image', () => {
		const html = `<head><meta name="twitter:image" content="https://cdn.site.com/capa.png"></head>`;
		expect(extractSocialImage(html, 'https://site.com/n/1')).toBe('https://cdn.site.com/capa.png');
	});

	test('returns empty when the page declares none', () => {
		expect(extractSocialImage('<head><title>x</title></head>', 'https://site.com')).toBe('');
	});
});
