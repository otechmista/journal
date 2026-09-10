/**
 * Shared HTML/text cleanup used by both the crawler and the reader.
 * The crawler persists cleaned content; the app applies the same rules again
 * before rendering public HTML from JSON.
 */

const CHANNEL_HREF =
	/whatsapp\.com\/channel|wa\.me\/channel|chat\.whatsapp\.com|tecnoblog\.net\/zap|t\.me\/\+?achados|t\.me\/ctofertas/i;

const PROMO_TEXT =
	/participe dos canais de ofertas|achados do tb|ct ofertas|melhores promo(?:ções|&#231;&#245;es|&ccedil;&otilde;es) de (?:hoje|celulares|smartwatches) no whatsapp/i;

const PLACEHOLDER = /\{\{\s*WHATSAPP_CHANNEL\s*\}\}/i;

const DANGEROUS_BLOCKS = /<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1>/gi;
const DANGEROUS_VOID = /<(?:iframe|object|embed|form)\b[^>]*\/?>/gi;
const EVENT_HANDLER = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URL_ATTR =
	/\s(href|src|xlink:href)\s*=\s*(["'])\s*(?:javascript|data:text\/html)\s*:[\s\S]*?\2/gi;

/**
 * @param {string} html
 * @returns {string}
 */
export function cleanContentHtml(html) {
	if (!html) return '';
	const passive = stripActiveContent(String(html));

	if (typeof DOMParser !== 'undefined') {
		const doc = new DOMParser().parseFromString(`<div id="__journal_root">${passive}</div>`, 'text/html');
		const root = doc.getElementById('__journal_root');
		if (root) {
			cleanDom(root);
			return scrubPromoPhrases(root.innerHTML);
		}
	}

	return scrubPromoPhrases(cleanHtmlFallback(passive));
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
 * @param {string} html
 */
function stripActiveContent(html) {
	return html
		.replace(DANGEROUS_BLOCKS, ' ')
		.replace(DANGEROUS_VOID, ' ')
		.replace(EVENT_HANDLER, '')
		.replace(DANGEROUS_URL_ATTR, '');
}

/**
 * @param {Element} root
 */
function cleanDom(root) {
	for (const a of [...root.querySelectorAll('a[href]')]) {
		const href = a.getAttribute('href') || '';
		const text = a.textContent || '';
		if (CHANNEL_HREF.test(href) || (PROMO_TEXT.test(text) && /whatsapp|telegram/i.test(text + href))) {
			const parent = a.parentElement;
			a.remove();
			if (parent && isEmptyNoiseElement(parent)) parent.remove();
		}
	}

	for (const el of [...root.querySelectorAll('div.social, aside, .widget-social, button.lightbox-trigger')]) {
		const blob = `${el.textContent || ''}${el.innerHTML || ''}`;
		if (
			el.matches('button.lightbox-trigger') ||
			CHANNEL_HREF.test(blob) ||
			/whatsapp|telegram/i.test(blob)
		) {
			el.remove();
		}
	}

	for (const el of [...root.querySelectorAll('p, li, div, span')]) {
		if (!el.isConnected) continue;
		const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
		const htmlInner = el.innerHTML || '';
		if (!text && !htmlInner) continue;
		if (PLACEHOLDER.test(text) || PLACEHOLDER.test(htmlInner)) {
			if (text.replace(PLACEHOLDER, '').trim() === '') {
				el.remove();
				continue;
			}
		}
		if (PROMO_TEXT.test(text) && /whatsapp|telegram|📱/i.test(text + htmlInner)) {
			if (el.children.length <= 2 || text.length < 180) el.remove();
		}
	}

	for (const el of [...root.querySelectorAll('ul, ol')]) {
		if (!el.querySelector('li') || !(el.textContent || '').trim()) el.remove();
	}
}

/**
 * Conservative fallback for Node/Bun contexts without DOMParser.
 * @param {string} html
 */
function cleanHtmlFallback(html) {
	let out = html;
	out = out.replace(/<a\b[^>]*href=["'][^"']*(?:whatsapp\.com\/channel|wa\.me\/channel|chat\.whatsapp\.com|tecnoblog\.net\/zap|t\.me\/\+?achados|t\.me\/ctofertas)[^"']*["'][\s\S]*?<\/a>/gi, ' ');
	out = out.replace(/<(?:div|aside|button)\b[^>]*(?:social|widget-social|lightbox-trigger)[^>]*>[\s\S]*?<\/(?:div|aside|button)>/gi, ' ');
	out = out.replace(/<(p|li|div|span)\b[^>]*>\s*\{\{\s*WHATSAPP_CHANNEL\s*\}\}\s*<\/\1>/gi, ' ');
	out = out.replace(/<(p|li|div|span)\b[^>]*>[\s\S]{0,280}?(?:whatsapp|telegram|📱)[\s\S]{0,280}?<\/\1>/gi, (m) =>
		PROMO_TEXT.test(stripTags(m)) ? ' ' : m
	);
	return out;
}

/**
 * @param {string} s
 */
function scrubPromoPhrases(s) {
	return String(s || '')
		.replace(/Participe dos canais de ofertas do Achados do TB\s*(WhatsApp)?\s*(Telegram)?/gi, ' ')
		.replace(
			/(?:📱\s*)?Veja as melhores promo(?:ções|&#231;&#245;es|&ccedil;&otilde;es)[\s\S]{0,180}?no WhatsApp[\s\S]{0,70}?CT Ofertas/gi,
			' '
		)
		.replace(/\{\{\s*WHATSAPP_CHANNEL\s*\}\}/gi, ' ')
		.replace(/https?:\/\/(?:www\.)?(?:whatsapp\.com\/channel|wa\.me\/channel)[^\s<"']*/gi, ' ');
}

/**
 * @param {Element} el
 */
function isEmptyNoiseElement(el) {
	const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
	if (!text) return true;
	if (PLACEHOLDER.test(text) && text.replace(PLACEHOLDER, '').trim() === '') return true;
	if (text.length < 120 && PROMO_TEXT.test(text)) return true;
	if (text.length < 40 && /^(WhatsApp|Telegram|📱)$/i.test(text)) return true;
	return false;
}

/**
 * @param {string} s
 */
function stripTags(s) {
	return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
