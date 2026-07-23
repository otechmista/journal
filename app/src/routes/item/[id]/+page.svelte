<script>
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { loadEdition } from '$lib/data.js';
	import ArticleView from '$lib/components/ArticleView.svelte';
	import AnnotationView from '$lib/components/AnnotationView.svelte';

	let item = $state(null);
	let loading = $state(true);
	let error = $state(null);
	let lastId = $state(null);

	async function loadItem(encodedId) {
		loading = true;
		error = null;
		item = null;
		try {
			const id = decodeURIComponent(encodedId);
			const { feed, status } = await loadEdition();
			const found = (feed.items || []).find((i) => i.id === id);
			if (!found) {
				const last = formatLastUpdate(status?.last_refresh_at);
				error = `Matéria não encontrada na edição atual. Última atualização: ${last}. Volte à lista ou aguarde o próximo crawl.`;
			} else {
				item = found;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function formatLastUpdate(iso) {
		if (!iso) return 'ainda não registrada';
		try {
			return new Date(iso).toLocaleString('pt-BR', {
				dateStyle: 'long',
				timeStyle: 'short'
			});
		} catch {
			return iso;
		}
	}

	$effect(() => {
		const encodedId = page.params.id;
		if (!encodedId || encodedId === lastId) return;
		lastId = encodedId;
		loadItem(encodedId);
	});
</script>

<main class="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pt-10">
	<nav
		class="mb-10 flex flex-wrap items-center justify-between gap-4 font-[family-name:var(--font-meta)] text-sm"
		aria-label="Navegação"
	>
		<a
			href="{base}/"
			class="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors"
		>
			Journal
		</a>
		<a
			href="{base}/#todos"
			class="text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
		>
			← Todas as matérias
		</a>
	</nav>

	{#if loading}
		<p class="text-[var(--color-ink-muted)] italic">Carregando…</p>
	{:else if error}
		<p class="text-[var(--color-accent)] leading-relaxed" role="alert">{error}</p>
		<p class="mt-6">
			<a href="{base}/#todos" class="text-[var(--color-accent)] hover:underline"
				>Ver todas as matérias</a
			>
		</p>
	{:else if item}
		<ArticleView {item} />
		<AnnotationView itemId={item.id} />
	{/if}
</main>
