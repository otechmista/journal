/**
 * Strip publisher promo noise (WhatsApp channels, offer CTAs) from article bodies.
 */
import * as cheerio from 'cheerio';

const CHANNEL_HREF =
	/whatsapp\.com\/channel|wa\.me\/channel|chat\.whatsapp\.com|tecnoblog\.net\/zap|t\.me\/\+?achados|t\.me\/ctofertas/i;

const PROMO_TEXT =
	/participe dos canais de ofertas|achados do tb|ct ofertas|melhores promo(?:ções|&#231;&#245;es|&ccedil;&otilde;es) de (?:hoje|celulares) no whatsapp/i;

const PLACEHOLDER = /\{\{\s*WHATSAPP_CHANNEL\s*\}\}/i;

/**
 * @param {string} html
 * @returns {string}
 */
export function cleanContentHtml(html) {
	if (!html) return '';
	const $ = cheerio.load(html, { xml: false }, false);

	$('a[href]').each((_, el) => {
		const href = $(el).attr('href') || '';
		const text = $(el).text();
		if (CHANNEL_HREF.test(href) || (PROMO_TEXT.test(text) && /whatsapp|telegram/i.test(text + href))) {
			const parent = $(el).parent();
			$(el).remove();
			if (parent.length && isEmptyNoise(parent)) parent.remove();
		}
	});

	$('div.social, aside, .widget-social, button.lightbox-trigger').each((_, el) => {
		const t = $(el).text();
		const h = $(el).html() || '';
		if (
			$(el).is('button.lightbox-trigger') ||
			CHANNEL_HREF.test(h) ||
			/whatsapp|telegram/i.test(t)
		) {
			$(el).remove();
		}
	});

	$('p, li, div, span').each((_, el) => {
		const node = $(el);
		if (!node.parent().length) return;
		const text = node.text().replace(/\s+/g, ' ').trim();
		const htmlInner = node.html() || '';
		if (!text && !htmlInner) return;
		if (PLACEHOLDER.test(text) || PLACEHOLDER.test(htmlInner)) {
			if (text.replace(PLACEHOLDER, '').trim() === '') {
				node.remove();
				return;
			}
		}
		if (PROMO_TEXT.test(text) && /whatsapp|telegram|📱/i.test(text + htmlInner)) {
			if (node.children().length <= 2 || text.length < 180) node.remove();
		}
	});

	$('ul, ol').each((_, el) => {
		const node = $(el);
		if (!node.find('li').length || !node.text().trim()) node.remove();
	});

	return scrubPromoPhrases($.root().html() || '');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function cleanContentText(text) {
	if (!text) return '';
	return scrubPromoPhrases(String(text)).replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} s
 */
function scrubPromoPhrases(s) {
	return s
		.replace(/Participe dos canais de ofertas do Achados do TB\s*(WhatsApp)?\s*(Telegram)?/gi, ' ')
		.replace(
			/(?:📱\s*)?Veja as melhores promo(?:ções|&#231;&#245;es|&ccedil;&otilde;es)[\s\S]{0,160}?no WhatsApp[\s\S]{0,60}?CT Ofertas/gi,
			' '
		)
		.replace(/\{\{\s*WHATSAPP_CHANNEL\s*\}\}/gi, ' ')
		.replace(/https?:\/\/(?:www\.)?(?:whatsapp\.com\/channel|wa\.me\/channel)[^\s<"']*/gi, ' ');
}

/**
 * @param {import('cheerio').Cheerio<any>} node
 */
function isEmptyNoise(node) {
	const text = node.text().replace(/\s+/g, ' ').trim();
	if (!text) return true;
	if (PLACEHOLDER.test(text) && text.replace(PLACEHOLDER, '').trim() === '') return true;
	if (text.length < 120 && PROMO_TEXT.test(text)) return true;
	if (text.length < 40 && /^(WhatsApp|Telegram|📱)$/i.test(text)) return true;
	return false;
}
