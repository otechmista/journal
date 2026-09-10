export const DEFAULT_RETENTION_DAYS = 14;

const SOURCE_TYPES = new Set(['rss', 'scrape']);
const CONTENT_STATUSES = new Set(['ok', 'missing', 'error']);
const JOB_STATES = new Set(['running', 'succeeded', 'failed']);

/**
 * @param {unknown} doc
 * @returns {{ version?: number, retention_days?: number, sources: any[] }}
 */
export function validateSourcesCatalog(doc) {
	const errors = [];
	if (!isObject(doc)) {
		throw new Error('sources.json must be an object');
	}
	if (!Array.isArray(doc.sources)) errors.push('sources must be an array');
	if (doc.retention_days != null && !isPositiveNumber(doc.retention_days)) {
		errors.push('retention_days must be a positive number when present');
	}

	const ids = new Set();
	for (const [i, source] of (Array.isArray(doc.sources) ? doc.sources : []).entries()) {
		const prefix = `sources[${i}]`;
		if (!isObject(source)) {
			errors.push(`${prefix} must be an object`);
			continue;
		}
		if (!nonEmpty(source.id)) errors.push(`${prefix}.id is required`);
		if (source.id && ids.has(source.id)) errors.push(`${prefix}.id duplicates ${source.id}`);
		if (source.id) ids.add(source.id);
		if (!nonEmpty(source.name)) errors.push(`${prefix}.name is required`);
		if (!SOURCE_TYPES.has(source.type)) errors.push(`${prefix}.type must be rss or scrape`);
		if (!isHttpUrl(source.url)) errors.push(`${prefix}.url must be an http(s) URL`);
		if (source.enabled != null && typeof source.enabled !== 'boolean') {
			errors.push(`${prefix}.enabled must be boolean when present`);
		}
		if (source.retention_days != null && !isPositiveNumber(source.retention_days)) {
			errors.push(`${prefix}.retention_days must be a positive number when present`);
		}
		if (source.type === 'scrape') {
			if (!isObject(source.selectors)) errors.push(`${prefix}.selectors is required for scrape sources`);
			else if (!nonEmpty(source.selectors.item)) errors.push(`${prefix}.selectors.item is required`);
		}
	}

	if (errors.length) throw new Error(`Invalid sources catalog: ${errors.join('; ')}`);
	return /** @type {any} */ (doc);
}

/**
 * @param {unknown} doc
 * @param {{ path?: string }} [opts]
 * @returns {{ items: any[] }}
 */
export function validateFeedDocument(doc, opts = {}) {
	const label = opts.path || 'feed document';
	const errors = [];
	if (!isObject(doc)) throw new Error(`${label} must be an object`);
	if (!Array.isArray(doc.items)) errors.push('items must be an array');
	for (const [i, item] of (Array.isArray(doc.items) ? doc.items : []).entries()) {
		errors.push(...validateFeedItem(item, `items[${i}]`));
	}
	if (errors.length) throw new Error(`Invalid ${label}: ${errors.join('; ')}`);
	return /** @type {any} */ (doc);
}

/**
 * @param {unknown} item
 * @param {string} prefix
 */
export function validateFeedItem(item, prefix = 'item') {
	const errors = [];
	if (!isObject(item)) return [`${prefix} must be an object`];
	if (!nonEmpty(item.id)) errors.push(`${prefix}.id is required`);
	if (!isHttpUrl(item.url)) errors.push(`${prefix}.url must be an http(s) URL`);
	if (!nonEmpty(item.title)) errors.push(`${prefix}.title is required`);
	if (item.date_published != null && !isIsoLikeDate(item.date_published)) {
		errors.push(`${prefix}.date_published must be parseable as a date`);
	}
	if (item.date_modified != null && !isIsoLikeDate(item.date_modified)) {
		errors.push(`${prefix}.date_modified must be parseable as a date`);
	}
	if (!isObject(item._journal)) {
		errors.push(`${prefix}._journal is required`);
		return errors;
	}
	if (!nonEmpty(item._journal.source_id)) errors.push(`${prefix}._journal.source_id is required`);
	if (!SOURCE_TYPES.has(item._journal.source_type)) {
		errors.push(`${prefix}._journal.source_type must be rss or scrape`);
	}
	if (!isIsoLikeDate(item._journal.ingested_at)) {
		errors.push(`${prefix}._journal.ingested_at must be parseable as a date`);
	}
	if (!CONTENT_STATUSES.has(item._journal.content_status)) {
		errors.push(`${prefix}._journal.content_status must be ok, missing, or error`);
	}
	return errors;
}

/**
 * @param {unknown} doc
 * @returns {{ last_refresh_at: string|null, jobs: any[] }}
 */
export function validateStatusDocument(doc) {
	const errors = [];
	if (!isObject(doc)) throw new Error('status.json must be an object');
	if (doc.last_refresh_at != null && !isIsoLikeDate(doc.last_refresh_at)) {
		errors.push('last_refresh_at must be null or parseable as a date');
	}
	if (!Array.isArray(doc.jobs)) errors.push('jobs must be an array');
	for (const [i, job] of (Array.isArray(doc.jobs) ? doc.jobs : []).entries()) {
		const prefix = `jobs[${i}]`;
		if (!isObject(job)) {
			errors.push(`${prefix} must be an object`);
			continue;
		}
		if (!nonEmpty(job.id)) errors.push(`${prefix}.id is required`);
		if (!nonEmpty(job.source_id)) errors.push(`${prefix}.source_id is required`);
		if (!JOB_STATES.has(job.state)) errors.push(`${prefix}.state must be running, succeeded, or failed`);
		if (!isIsoLikeDate(job.started_at)) errors.push(`${prefix}.started_at must be parseable as a date`);
		if (job.finished_at != null && !isIsoLikeDate(job.finished_at)) {
			errors.push(`${prefix}.finished_at must be null or parseable as a date`);
		}
		if (!Number.isFinite(job.items_found) || job.items_found < 0) {
			errors.push(`${prefix}.items_found must be a non-negative number`);
		}
		if (!Number.isFinite(job.items_downloaded) || job.items_downloaded < 0) {
			errors.push(`${prefix}.items_downloaded must be a non-negative number`);
		}
		if (job.warning != null && typeof job.warning !== 'string') {
			errors.push(`${prefix}.warning must be a string when present`);
		}
	}
	if (errors.length) throw new Error(`Invalid status document: ${errors.join('; ')}`);
	return /** @type {any} */ (doc);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 */
function nonEmpty(value) {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value
 */
function isHttpUrl(value) {
	if (!nonEmpty(value)) return false;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * @param {unknown} value
 */
function isIsoLikeDate(value) {
	if (!nonEmpty(value)) return false;
	return !Number.isNaN(Date.parse(value));
}

/**
 * @param {unknown} value
 */
function isPositiveNumber(value) {
	return Number.isFinite(value) && value > 0;
}
