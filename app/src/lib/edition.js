/**
 * Client-side edition search + pagination helpers.
 */

/** @param {string} value */
export function normalizeQuery(value) {
	return String(value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

/**
 * @param {any[]} items
 * @param {string} query
 */
export function filterItems(items, query) {
	const list = Array.isArray(items) ? items : [];
	const q = normalizeQuery(query);
	if (!q) return list;
	const tokens = q.split(/\s+/).filter(Boolean);
	return list.filter((item) => {
		const hay = normalizeQuery(
			[
				item.title,
				item.summary,
				item.content_text,
				item._journal?.source_id,
				item.url
			]
				.filter(Boolean)
				.join(' ')
		);
		return tokens.every((t) => hay.includes(t));
	});
}

/**
 * @param {any[]} items
 * @param {number} page
 * @param {number} pageSize
 */
export function paginateItems(items, page, pageSize) {
	const list = Array.isArray(items) ? items : [];
	const size = Math.max(1, pageSize);
	const totalPages = Math.max(1, Math.ceil(list.length / size));
	const current = Math.min(Math.max(1, page), totalPages);
	const start = (current - 1) * size;
	return {
		items: list.slice(start, start + size),
		page: current,
		pageSize: size,
		total: list.length,
		totalPages,
		from: list.length === 0 ? 0 : start + 1,
		to: Math.min(start + size, list.length)
	};
}

/**
 * Compact page number list with ellipsis markers.
 * @param {number} current
 * @param {number} total
 */
export function pageWindow(current, total) {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages = new Set([1, total, current, current - 1, current + 1]);
	if (current <= 3) {
		pages.add(2);
		pages.add(3);
		pages.add(4);
	}
	if (current >= total - 2) {
		pages.add(total - 1);
		pages.add(total - 2);
		pages.add(total - 3);
	}
	const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
	/** @type {(number|'…')[]} */
	const out = [];
	for (let i = 0; i < sorted.length; i++) {
		if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
		out.push(sorted[i]);
	}
	return out;
}
