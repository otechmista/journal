<script>
	import { onMount } from 'svelte';
	import { loadEdition } from '$lib/data.js';
	import Masthead from '$lib/components/Masthead.svelte';
	import HeadlineList from '$lib/components/HeadlineList.svelte';
	import SourcesPanel from '$lib/components/SourcesPanel.svelte';

	let feed = $state({ items: [] });
	let status = $state({ last_refresh_at: null, jobs: [] });
	let sources = $state({ sources: [] });
	let loading = $state(false);
	let error = $state(null);
	let sourcesOpen = $state(false);

	async function reload() {
		loading = true;
		error = null;
		try {
			const data = await loadEdition();
			feed = data.feed;
			status = data.status;
			sources = data.sources;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		reload();
		if (typeof window !== 'undefined' && window.location.hash === '#todos') {
			queueMicrotask(() => {
				document.getElementById('todos')?.scrollIntoView({ behavior: 'smooth' });
			});
		}
	});
</script>

<main class="mx-auto max-w-3xl px-4 pb-20">
	<Masthead
		lastRefreshAt={status.last_refresh_at}
		{loading}
		{sourcesOpen}
		showCallout={true}
		onrefresh={reload}
		ontogglesources={() => (sourcesOpen = !sourcesOpen)}
	/>

	<SourcesPanel sources={sources.sources || []} open={sourcesOpen} />

	{#if error}
		<p class="text-center text-[var(--color-accent)] text-sm mb-6" role="alert">{error}</p>
	{/if}

	{#if status.jobs?.some((j) => j.state === 'failed')}
		<details class="mb-6 text-sm text-[var(--color-ink-muted)] font-[family-name:var(--font-meta)]">
			<summary class="cursor-pointer text-[var(--color-accent)]">Algumas fontes falharam</summary>
			<ul class="mt-2 list-disc pl-5 space-y-1">
				{#each status.jobs.filter((j) => j.state === 'failed') as j}
					<li>{j.source_id}: {j.error}</li>
				{/each}
			</ul>
		</details>
	{/if}

	<section id="todos" class="scroll-mt-6">
		<h2
			class="mb-2 font-[family-name:var(--font-meta)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-ink-muted)]"
		>
			Todas as matérias
		</h2>
		<HeadlineList items={feed.items || []} />
	</section>
</main>
