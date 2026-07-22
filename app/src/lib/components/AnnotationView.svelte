<script>
	import { upsertNote, getNote } from '$lib/annotations.js';

	let { itemId = null } = $props();

	let draft = $state('');
	let savedAt = $state(null);
	let dirty = $state(false);

	$effect(() => {
		const id = itemId;
		if (!id) {
			draft = '';
			savedAt = null;
			dirty = false;
			return;
		}
		const note = getNote(id);
		draft = note?.text || '';
		savedAt = note?.updated_at || null;
		dirty = false;
	});

	function save() {
		if (!itemId) return;
		const notes = upsertNote(itemId, draft);
		const note = notes[itemId];
		savedAt = note?.updated_at || null;
		dirty = false;
		if (!draft.trim()) {
			savedAt = null;
		}
	}

	function clear() {
		if (!itemId) return;
		draft = '';
		upsertNote(itemId, '');
		savedAt = null;
		dirty = false;
	}
</script>

<section class="mt-10 pt-6 border-t border-[color-mix(in_srgb,var(--color-rule)_25%,transparent)]">
	<h3
		class="font-[family-name:var(--font-meta)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-ink-muted)] mb-3"
	>
		Your notes
	</h3>
	{#if !itemId}
		<p class="text-sm text-[var(--color-ink-muted)] italic">Open a story to annotate.</p>
	{:else}
		<p class="mb-3 text-xs text-[var(--color-ink-muted)] font-[family-name:var(--font-meta)]">
			Private to this browser (localStorage) — not published with the public JSON feeds.
		</p>
		<textarea
			class="w-full min-h-28 bg-[var(--color-highlight)] border border-[color-mix(in_srgb,var(--color-rule)_20%,transparent)] px-3 py-2 font-[family-name:var(--font-body)] text-[var(--color-ink)] text-base leading-relaxed outline-none focus:border-[var(--color-accent)] resize-y"
			placeholder="Write a personal note on this story…"
			bind:value={draft}
			oninput={() => (dirty = true)}
		></textarea>
		<div class="mt-3 flex flex-wrap items-center gap-4 font-[family-name:var(--font-meta)] text-sm">
			<button
				type="button"
				class="text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
				onclick={save}
				disabled={!dirty && !draft.trim() && !savedAt}
			>
				Save
			</button>
			<button
				type="button"
				class="text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
				onclick={clear}
			>
				Clear
			</button>
			{#if savedAt && !dirty}
				<span class="text-[0.7rem] text-[var(--color-ink-muted)]">
					Saved {new Date(savedAt).toLocaleString('pt-BR')}
				</span>
			{:else if dirty}
				<span class="text-[0.7rem] text-[var(--color-accent)]">Unsaved</span>
			{/if}
		</div>
	{/if}
</section>
