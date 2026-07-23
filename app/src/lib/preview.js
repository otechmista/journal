/**
 * Card previews for the edition grid: image, lead, publication date and
 * highlight rules. Regex-based (no DOM) so it runs during prerender too.
 */

const IMG_TAG = /<img\b[^>]*>/gi;
const IMG_SRC = /\s(?:src|data-src|data-lazy-src|data-original)\s*=\s*["']([^"'\s]+)["']/i;
const IMG_SRCSET = /\ssrcset\s*=\s*["']([^"']+)["']/i;

/** Logos, icons and other chrome that should never become a card image. */
const JUNK_IMAGE =
	/\/(?:themes|plugins|static\/icons)\/|logo|sprite|avatar|gravatar|placeholder|spacer|pixel|1x1|blank\.|selo-|badge/i;

const HIDDEN_BLOCKS =
	/<(script|style|figure|figcaption|aside|table|noscript)\b[\s\S]*?<\/\1>/gi;
const PARAGRAPH = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

/** Terms that mark a story as AI-related (case-insensitive). */
const AI_TERMS =
	/intelig[êe]ncia artificial|artificial intelligence|anthropic|claude|openai|chatgpt|\bgpt\b|gpt-\d|copilot|gemini|deepseek|mistral|midjourney|stable diffusion|hugging ?face|\bllms?\b|modelos? de linguagem|large language model|machine learning|aprendizado de m[áa]quina|deep learning|redes neurais|neural network|\bia generativa\b|\bgenerativ[ao]\b|\bagi\b|chatbot|assistente de ia|nvidia h100|perplexity ai/i;

/** Bare “IA”/“AI” acronyms — matched case-sensitively to avoid false hits. */
const AI_ACRONYM = /\b(?:IA|AI|AGI|LLM|LLMs)\b/;

const ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	ndash: '–',
	mdash: '—',
	hellip: '…',
	ldquo: '“',
	rdquo: '”',
	lsquo: '‘',
	rsquo: '’',
	laquo: '«',
	raquo: '»',
	deg: '°',
	ordm: 'º',
	ordf: 'ª',
	times: '×',
	euro: '€',
	pound: '£',
	copy: '©',
	reg: '®',
	trade: '™',
	aacute: 'á',
	agrave: 'à',
	acirc: 'â',
	atilde: 'ã',
	eacute: 'é',
	ecirc: 'ê',
	iacute: 'í',
	oacute: 'ó',
	ocirc: 'ô',
	otilde: 'õ',
	uacute: 'ú',
	uuml: 'ü',
	ccedil: 'ç',
	Aacute: 'Á',
	Agrave: 'À',
	Acirc: 'Â',
	Atilde: 'Ã',
	Eacute: 'É',
	Ecirc: 'Ê',
	Iacute: 'Í',
	Oacute: 'Ó',
	Ocirc: 'Ô',
	Otilde: 'Õ',
	Uacute: 'Ú',
	Ccedil: 'Ç'
};

/**
 * @param {string} s
 * @returns {string}
 */
export function decodeEntities(s) {
	return String(s || '')
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => safeChar(parseInt(dec, 10)))
		.replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m);
}

/** @param {number} code */
function safeChar(code) {
	if (!Number.isFinite(code) || code < 9 || code > 0x10ffff) return '';
	try {
		return String.fromCodePoint(code);
	} catch {
		return '';
	}
}

/**
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
	return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' '))
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * First usable illustration for a story: the crawled `image` field when the
 * source provided one, else the first meaningful `<img>` in the body.
 * @param {any} item
 * @returns {string|null}
 */
export function itemImage(item) {
	if (!item) return null;
	const declared = typeof item.image === 'string' ? item.image.trim() : '';
	if (/^https?:\/\//i.test(declared)) return declared;
	return firstImageFromHtml(item.content_html);
}

/**
 * @param {string} html
 * @returns {string|null}
 */
export function firstImageFromHtml(html) {
	if (!html) return null;
	IMG_TAG.lastIndex = 0;
	let match;
	while ((match = IMG_TAG.exec(html))) {
		const tag = match[0];
		const url = imageUrlFromTag(tag);
		if (url) return url;
	}
	return null;
}

/** @param {string} tag */
function imageUrlFromTag(tag) {
	const direct = tag.match(IMG_SRC)?.[1];
	const candidate = direct || largestFromSrcset(tag.match(IMG_SRCSET)?.[1]);
	if (!candidate) return null;
	const url = decodeEntities(candidate).trim();
	if (!/^https?:\/\//i.test(url)) return null;
	if (JUNK_IMAGE.test(url)) return null;
	return url;
}

/** @param {string|undefined} srcset */
function largestFromSrcset(srcset) {
	if (!srcset) return '';
	let best = '';
	let bestWidth = -1;
	for (const entry of srcset.split(',')) {
		const [url, size] = entry.trim().split(/\s+/);
		if (!url) continue;
		const width = size?.endsWith('w') ? Number(size.slice(0, -1)) : 0;
		if (width > bestWidth) {
			bestWidth = width;
			best = url;
		}
	}
	return best;
}

/**
 * Lead paragraph for a card: the editorial summary when the source ships one,
 * otherwise the opening sentences of the article body.
 * @param {any} item
 * @param {number} [maxLength]
 * @returns {string}
 */
export function itemLead(item, maxLength = 220) {
	if (!item) return '';
	const summary = cleanSummary(item.summary, item.title);
	if (summary.length >= 60) return truncateAtWord(summary, maxLength);

	const paragraph = firstParagraphFromHtml(item.content_html);
	if (paragraph.length >= 60) return truncateAtWord(paragraph, maxLength);

	const text = stripTags(item.content_text || '');
	const fallback = summary || paragraph || text;
	return truncateAtWord(fallback, maxLength);
}

/**
 * @param {string} html
 * @returns {string}
 */
export function firstParagraphFromHtml(html) {
	if (!html) return '';
	const body = String(html).replace(HIDDEN_BLOCKS, ' ');
	PARAGRAPH.lastIndex = 0;
	let match;
	let firstShort = '';
	while ((match = PARAGRAPH.exec(body))) {
		const text = stripTags(match[1]);
		if (text.length >= 80) return text;
		if (text.length > firstShort.length) firstShort = text;
	}
	return firstShort;
}

/**
 * Feeds often repeat the headline at the end of the summary — drop it.
 * @param {string} summary
 * @param {string} [title]
 */
function cleanSummary(summary, title) {
	let text = stripTags(summary || '');
	const headline = stripTags(title || '');
	if (headline && text.toLowerCase().endsWith(headline.toLowerCase())) {
		text = text.slice(0, text.length - headline.length).trim();
	}
	return text.replace(/[\s—–-]+$/, '').trim();
}

/**
 * @param {string} text
 * @param {number} maxLength
 */
export function truncateAtWord(text, maxLength) {
	const t = String(text || '').trim();
	if (t.length <= maxLength) return t;
	const slice = t.slice(0, maxLength);
	const cut = slice.lastIndexOf(' ');
	return `${(cut > maxLength * 0.6 ? slice.slice(0, cut) : slice).replace(/[\s,;:.—–-]+$/, '')}…`;
}

/**
 * @param {any} item
 * @returns {boolean}
 */
export function isAiItem(item) {
	if (!item) return false;
	const haystack = [item.title, item.summary, (item.content_text || '').slice(0, 600)]
		.filter(Boolean)
		.join(' ');
	return AI_TERMS.test(haystack) || AI_ACRONYM.test(haystack);
}

/**
 * Published within `hours` of the edition reference time (newest story).
 * @param {any} item
 * @param {string|number|Date|null} reference
 * @param {number} [hours]
 */
export function isFreshItem(item, reference, hours = 8) {
	const published = toTime(item?.date_published);
	const ref = toTime(reference);
	if (published === null || ref === null) return false;
	const age = ref - published;
	// Tolerate items dated slightly ahead of the reference (clock skew in feeds).
	return age >= -3600_000 && age <= hours * 3600_000;
}

/** @param {any} value */
function toTime(value) {
	if (!value) return null;
	const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
	return Number.isNaN(t) ? null : t;
}

/**
 * Newest publication date in the edition — the yardstick for "fresh".
 * @param {any[]} items
 * @returns {string|null}
 */
export function editionReference(items) {
	const list = Array.isArray(items) ? items : [];
	let best = null;
	for (const item of list) {
		const t = toTime(item?.date_published);
		if (t !== null && (best === null || t > best)) best = t;
	}
	return best === null ? null : new Date(best).toISOString();
}

/**
 * Badges rendered on a card. AI first, then freshness.
 * @param {any} item
 * @param {{ reference?: string|null, freshHours?: number }} [opts]
 * @returns {{ id: 'ai'|'fresh', label: string, title: string }[]}
 */
export function itemBadges(item, opts = {}) {
	const badges = [];
	if (isAiItem(item)) {
		badges.push({ id: 'ai', label: 'IA', title: 'Matéria sobre inteligência artificial' });
	}
	if (isFreshItem(item, opts.reference ?? null, opts.freshHours ?? 8)) {
		badges.push({ id: 'fresh', label: 'Novo', title: 'Publicada nas últimas horas' });
	}
	return badges;
}

/**
 * @param {any} item
 * @param {{ reference?: string|null, freshHours?: number }} [opts]
 */
export function isHighlighted(item, opts = {}) {
	return itemBadges(item, opts).length > 0;
}

/**
 * Front-page highlights: AI stories first, then the freshest ones.
 * @param {any[]} items
 * @param {{ reference?: string|null, freshHours?: number, limit?: number }} [opts]
 */
export function highlightItems(items, opts = {}) {
	const list = Array.isArray(items) ? items : [];
	const reference = opts.reference ?? editionReference(list);
	const freshHours = opts.freshHours ?? 8;
	const limit = opts.limit ?? 3;

	return list
		.map((item) => ({
			item,
			ai: isAiItem(item),
			fresh: isFreshItem(item, reference, freshHours),
			time: toTime(item?.date_published) ?? 0
		}))
		.filter((entry) => entry.ai || entry.fresh)
		.sort((a, b) => Number(b.ai) - Number(a.ai) || b.time - a.time)
		.slice(0, limit)
		.map((entry) => entry.item);
}

/**
 * @param {string} iso
 * @param {{ withTime?: boolean }} [opts]
 */
export function formatPublishedDate(iso, opts = {}) {
	if (!iso) return '';
	const t = toTime(iso);
	if (t === null) return '';
	try {
		return new Date(t).toLocaleString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			...(opts.withTime ? { hour: '2-digit', minute: '2-digit' } : {})
		});
	} catch {
		return String(iso);
	}
}

/* --- Topics ------------------------------------------------------------- */

/** Corporate IT: cloud, infra, security, telecom, government, market. */
const TI_TERMS =
	/\bti\b|tecnologia da informa[çc][ãa]o|nuvem|\bcloud\b|data ?center|servidor|hospedagem|infraestrutura|seguran[çc]a digital|ciberseguran|ciber-?ataque|hacker|ransomware|malware|phishing|vazamento de dados|prote[çc][ãa]o de dados|lgpd|privacidade|\btelecom|opera[çc][ãa]o de rede|banda larga|\b5g\b|fibra [óo]ptica|anatel|governo|gov\.br|receita federal|licita[çc]|estatal|setor p[úu]blico|transforma[çc][ãa]o digital|\bstartup|investimento|aquisi[çc][ãa]o|fus[ãa]o|bilh[õo]es|mercado financeiro|a[çc][õo]es da|nasdaq|\bb3\b|fintech|\bpix\b|meio de pagamento|banco central|cortes|demiss[õo]es|\blayoffs?\b|capacita[çc][ãa]o|bootcamp|desenvolvedores?/i;

/** Consumer tech: phones, gadgets, wearables, reviews, deals. */
const CONSUMO_TERMS =
	/smartphone|celular|\biphone\b|galaxy|xiaomi|motorola|realme|notebook|laptop|tablet|smartwatch|\bfone\b|headphone|earbud|wearable|c[âa]mera|smart tv|\btv\b|gadget|review|unboxing|oferta|desconto|promo[çc][ãa]o|mercado livre|lan[çc]amento|\bpre[çc]o\b|\bR\$|dispon[íi]vel por|bateria|carregador|processador|chip snapdragon/i;

/** Games, science and space (kept specific so gadgets don't leak in). */
const GAMES_CIENCIA_TERMS =
	/\bgame\b|\bgames\b|\bjogo\b|\bjogos\b|\bgamer|playstation|\bps5\b|\bxbox\b|nintendo|\bsteam\b|\bconsole\b|\bespa[çc]o\b|\bnasa\b|foguete|sat[ée]lite|astronom|telesc[óo]pio|\bplaneta|estudo cient[íi]fico|pesquisadores|f[íi]sica qu[âa]ntica|f[óo]ssil|dinossauro|\bgal[áa]xia/i;

/** Design / UX / product / CX (kept specific so tech doesn't leak in). */
const DESIGN_TERMS =
	/\bux\b|\bui\/ux\b|user experience|experi[êe]ncia do usu[áa]rio|usabilidade|usability|design system|design thinking|service design|product design|interaction design|design de intera[çc][ãa]o|design de produto|wireframe|prototyp|prot[óo]tipo|figma|acessibilidade|accessibility|arquitetura de informa[çc][ãa]o|information architecture|\bhci\b|customer experience|experi[êe]ncia do cliente|user research|pesquisa de usu[áa]rio|design de servi[çc]o/i;

/** Display order for the topic tabs. Design & UX leads this edition. */
export const TOPICS = [
	{ id: 'design', label: 'Design & UX', blurb: 'UX, UI, produto, research e CX' },
	{ id: 'ti', label: 'TI & Corporativo', blurb: 'Nuvem, segurança, telecom, mercado e governo' },
	{ id: 'ia', label: 'Inteligência Artificial', blurb: 'Modelos, empresas e aplicações de IA' },
	{ id: 'consumo', label: 'Consumo & Gadgets', blurb: 'Celulares, gadgets, reviews e ofertas' },
	{ id: 'outros', label: 'Games, Ciência & Outros', blurb: 'Games, ciência, espaço e demais assuntos' }
];

const TOPIC_IDS = TOPICS.map((t) => t.id);
const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

/**
 * @param {any} item
 * @returns {boolean}
 */
export function isDesignItem(item) {
	if (!item) return false;
	const haystack = [item.title, item.summary, (item.content_text || '').slice(0, 600)]
		.filter(Boolean)
		.join(' ');
	return DESIGN_TERMS.test(haystack);
}

/**
 * Assign a story to exactly one topic. IA wins over everything (most specific
 * signal), then explicit design terms; a per-source topic hint (from
 * sources.json) then decides sources we already know the beat of; finally the
 * consumer / games / corporate keyword fallbacks, else "outros".
 * @param {any} item
 * @param {{ sourceTopics?: Record<string, string> }} [opts]
 * @returns {'design'|'ti'|'ia'|'consumo'|'outros'}
 */
export function classifyTopic(item, opts = {}) {
	if (!item) return 'outros';
	if (isAiItem(item)) return 'ia';
	if (isDesignItem(item)) return 'design';
	const hint = opts.sourceTopics?.[item?._journal?.source_id];
	if (hint && TOPIC_IDS.includes(hint)) return /** @type {any} */ (hint);
	const haystack = [item.title, item.summary, (item.content_text || '').slice(0, 500)]
		.filter(Boolean)
		.join(' ');
	if (CONSUMO_TERMS.test(haystack)) return 'consumo';
	if (GAMES_CIENCIA_TERMS.test(haystack)) return 'outros';
	if (TI_TERMS.test(haystack)) return 'ti';
	return 'outros';
}

/**
 * Build a `{ source_id: topic }` map from the sources catalog.
 * @param {{ id: string, topic?: string }[]} [sources]
 * @returns {Record<string, string>}
 */
export function sourceTopicMap(sources = []) {
	/** @type {Record<string, string>} */
	const map = {};
	for (const s of sources || []) {
		if (s?.id && s.topic) map[s.id] = s.topic;
	}
	return map;
}

/**
 * Keep only items in a given topic ('todos' returns everything).
 * @param {any[]} items
 * @param {string} topicId
 * @param {{ sourceTopics?: Record<string, string> }} [opts]
 */
export function filterByTopic(items, topicId, opts = {}) {
	const list = Array.isArray(items) ? items : [];
	if (!topicId || topicId === 'todos') return list;
	return list.filter((item) => classifyTopic(item, opts) === topicId);
}

/**
 * Tab descriptors — "Todos" plus every non-empty topic, in display order.
 * @param {any[]} items
 * @param {{ sourceTopics?: Record<string, string> }} [opts]
 * @returns {{ id: string, label: string, count: number }[]}
 */
export function topicTabs(items, opts = {}) {
	const list = Array.isArray(items) ? items : [];
	/** @type {Record<string, number>} */
	const counts = {};
	for (const item of list) {
		const id = classifyTopic(item, opts);
		counts[id] = (counts[id] || 0) + 1;
	}
	const tabs = [{ id: 'todos', label: 'Todos', count: list.length }];
	for (const topic of TOPICS) {
		if (counts[topic.id]) tabs.push({ id: topic.id, label: topic.label, count: counts[topic.id] });
	}
	return tabs;
}

/**
 * Group items into topic sections in display order, newest first within each,
 * dropping empty topics.
 * @param {any[]} items
 * @param {{ perTopic?: number, sourceTopics?: Record<string, string> }} [opts]
 * @returns {{ id: string, label: string, blurb: string, items: any[], total: number }[]}
 */
export function topicSections(items, opts = {}) {
	const list = Array.isArray(items) ? items : [];
	const perTopic = opts.perTopic ?? Infinity;
	/** @type {Record<string, any[]>} */
	const buckets = Object.fromEntries(TOPIC_IDS.map((id) => [id, []]));
	for (const item of list) buckets[classifyTopic(item, opts)].push(item);

	return TOPICS.map((topic) => {
		const bucket = buckets[topic.id].sort(
			(a, b) => (toTime(b?.date_published) ?? 0) - (toTime(a?.date_published) ?? 0)
		);
		return {
			id: topic.id,
			label: topic.label,
			blurb: topic.blurb,
			total: bucket.length,
			items: bucket.slice(0, perTopic)
		};
	}).filter((section) => section.total > 0);
}

/**
 * @param {string} id
 * @returns {string}
 */
export function topicLabel(id) {
	return TOPIC_LABELS[id]?.label || 'Outros';
}

/**
 * @param {string} sourceId
 * @param {{ id: string, name?: string }[]} [sources]
 */
export function sourceLabel(sourceId, sources = []) {
	if (!sourceId) return 'fonte';
	const known = (sources || []).find((s) => s.id === sourceId);
	if (known?.name) return known.name;
	return String(sourceId).replace(/^src_/, '').replace(/_/g, ' ');
}
