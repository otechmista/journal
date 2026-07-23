/**
 * Stable short slug for article routes (works in browser + Node, no async).
 * @param {string} id
 */
export function itemSlug(id) {
	const s = String(id || '');
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return `${(h >>> 0).toString(16).padStart(8, '0')}${s.length.toString(16)}`;
}

/**
 * @param {{ id?: string }[]} items
 * @param {string} slug
 */
export function findBySlug(items, slug) {
	const list = Array.isArray(items) ? items : [];
	return list.find((item) => itemSlug(item.id) === slug) || null;
}
