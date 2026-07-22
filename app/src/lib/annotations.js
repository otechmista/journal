const STORAGE_KEY = 'journal.annotations.v1';

/**
 * @typedef {{ text: string, updated_at: string }} UserNote
 * @typedef {Record<string, UserNote>} NotesMap
 */

/**
 * @returns {NotesMap}
 */
export function loadNotes() {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

/**
 * @param {NotesMap} notes
 */
export function saveNotes(notes) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/**
 * @param {string} itemId
 * @param {string} text
 * @returns {NotesMap}
 */
export function upsertNote(itemId, text) {
	const notes = loadNotes();
	const trimmed = text.trim();
	if (!trimmed) {
		delete notes[itemId];
	} else {
		notes[itemId] = {
			text: trimmed,
			updated_at: new Date().toISOString()
		};
	}
	saveNotes(notes);
	return notes;
}

/**
 * @param {string} itemId
 * @returns {UserNote | null}
 */
export function getNote(itemId) {
	const notes = loadNotes();
	return notes[itemId] || null;
}
