import { PATHS } from './paths.js';

/**
 * @returns {Promise<{ version: number, sources: any[] }>}
 */
export async function loadSources() {
	const file = Bun.file(PATHS.sources);
	if (!(await file.exists())) {
		throw new Error(`Missing sources file: ${PATHS.sources}`);
	}
	return file.json();
}

/**
 * @param {string} [sourceId]
 */
export async function getEnabledSources(sourceId) {
	const catalog = await loadSources();
	let sources = catalog.sources.filter((s) => s.enabled);
	if (sourceId) {
		sources = sources.filter((s) => s.id === sourceId);
		if (!sources.length) throw new Error(`Source not found or disabled: ${sourceId}`);
	}
	return sources;
}
