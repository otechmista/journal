/**
 * Strip WhatsApp channel / offer-channel promo noise from article HTML/text (client).
 */

const CHANNEL_HREF =
	/whatsapp\.com\/channel|wa\.me\/channel|chat\.whatsapp\.com|tecnoblog\.net\/zap/i;

const PROMO_TEXT =
	/participe dos canais de ofertas|achados do tb|ct ofertas|melhores promo/i;

const PLACEHOLDER = /\{\{\s*WHATSAPP_CHANNEL\s*\}\}/i;

/**
 * @param {string} html
 * @returns {string}
 */
export function cleanContentHtml(html) {
	if (!html || typeof DOMParser === 'undefined') return scrubPromoPhrases(html || '');
	const doc = new DOMParser().parseFromString(`<div id="__j">${html}</div>`, 'text/html');
	const root = doc.getElementById('__j');
	if (!root) return scrubPromoPhrases(html);

	for (const a of [...root.querySelectorAll('a[href]')]) {
		const href = a.getAttribute('href') || '';
		const text = a.textContent || '';
		if (CHANNEL_HREF.test(href) || (PROMO_TEXT.test(text) && /whatsapp|telegram/i.test(text + href))) {
			const parent = a.parentElement;
			a.remove();
			if (parent && isEmptyNoise(parent)) parent.remove();
		}
	}

	for (const el of [...root.querySelectorAll('div.social, aside, button.lightbox-trigger')]) {
		const blob = `${el.textContent || ''}${el.innerHTML || ''}`;
		if (
			el.matches('button.lightbox-trigger') ||
			CHANNEL_HREF.test(blob) ||
			/whatsapp|telegram/i.test(blob)
		) {
			el.remove();
		}
	}

	for (const el of [...root.querySelectorAll('li, p, div, span')]) {
		if (!el.isConnected) continue;
		const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
		const htmlInner = el.innerHTML || '';
		if (PLACEHOLDER.test(text) || PLACEHOLDER.test(htmlInner)) {
			if (text.replace(PLACEHOLDER, '').trim() === '') {
				el.remove();
				continue;
			}
		}
		if (!text) continue;
		if (
			PROMO_TEXT.test(text) &&
			/whatsapp|telegram|📱/i.test(text) &&
			(el.children.length <= 2 || text.length < 180)
		) {
			el.remove();
		}
	}

	for (const el of [...root.querySelectorAll('ul, ol')]) {
		if (!el.querySelector('li') || !(el.textContent || '').trim()) el.remove();
	}

	return scrubPromoPhrases(root.innerHTML);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function cleanContentText(text) {
	if (!text) return '';
	return scrubPromoPhrases(String(text)).replace(/\s+/g, ' ').trim();
}

/** @param {string} s */
function scrubPromoPhrases(s) {
	return s
		.replace(/Participe dos canais de ofertas do Achados do TB\s*(WhatsApp)?\s*(Telegram)?/gi, ' ')
		.replace(
			/(?:📱\s*)?Veja as melhores promo(?:ções|&ccedil;&otilde;es)[\s\S]{0,160}?no WhatsApp[\s\S]{0,60}?CT Ofertas/gi,
			' '
		)
		.replace(/\{\{\s*WHATSAPP_CHANNEL\s*\}\}/gi, ' ')
		.replace(/https?:\/\/(?:www\.)?(?:whatsapp\.com\/channel|wa\.me\/channel)[^\s<"']*/gi, ' ');
}

/** @param {Element} el */
function isEmptyNoise(el) {
	const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
	if (!text) return true;
	if (PLACEHOLDER.test(text) && text.replace(PLACEHOLDER, '').trim() === '') return true;
	if (text.length < 120 && PROMO_TEXT.test(text)) return true;
	if (text.length < 40 && /^(WhatsApp|Telegram|📱)$/i.test(text)) return true;
	return false;
}
