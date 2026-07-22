import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Root `data/` directory (shared public JSON). */
export const DATA_DIR = join(__dirname, '..', '..', 'data');

export const PATHS = {
	sources: join(DATA_DIR, 'sources.json'),
	annotations: join(DATA_DIR, 'annotations.json'),
	status: join(DATA_DIR, 'jobs', 'status.json'),
	feedsDir: join(DATA_DIR, 'feeds'),
	articlesDir: join(DATA_DIR, 'articles'),
	unified: join(DATA_DIR, 'feeds', 'unified.json')
};

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function absoluteUrl(href, base) {
	try {
		return new URL(href, base).href;
	} catch {
		return null;
	}
}

export function sameOrigin(a, b) {
	try {
		return new URL(a).origin === new URL(b).origin;
	} catch {
		return false;
	}
}
