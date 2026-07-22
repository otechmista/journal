<script>
	import { base } from '$app/paths';
	import { RefreshCw, List, Home, Newspaper } from '@lucide/svelte';

	let {
		lastRefreshAt = null,
		loading = false,
		sourcesOpen = false,
		showCallout = true,
		onrefresh = undefined,
		ontogglesources = undefined
	} = $props();

	function formatDateline(iso) {
		if (!iso) return 'Edição pendente — rode bun run crawl';
		try {
			return new Date(iso).toLocaleString('pt-BR', {
				dateStyle: 'long',
				timeStyle: 'short'
			});
		} catch {
			return iso;
		}
	}
</script>

<header class="text-center pt-8 pb-6 px-4">
	<nav
		class="mb-6 flex flex-wrap items-center justify-center gap-5 font-[family-name:var(--font-meta)] text-sm text-[var(--color-ink)]"
		aria-label="Principal"
	>
		<a
			href="{base}/"
			class="inline-flex items-center gap-1.5 hover:text-[var(--color-accent)] transition-colors"
		>
			<Home size={15} />
			Início
		</a>
		<a
			href="{base}/#todos"
			class="inline-flex items-center gap-1.5 hover:text-[var(--color-accent)] transition-colors"
		>
			<Newspaper size={15} />
			Todos
		</a>
		<button
			type="button"
			class="inline-flex items-center gap-1.5 hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
			onclick={() => onrefresh?.()}
			disabled={loading}
		>
			<RefreshCw size={15} class={loading ? 'animate-spin' : ''} />
			{loading ? 'Atualizando…' : 'Atualizar'}
		</button>
		<button
			type="button"
			class="inline-flex items-center gap-1.5 hover:text-[var(--color-accent)] transition-colors"
			onclick={() => ontogglesources?.()}
			aria-expanded={sourcesOpen}
		>
			<List size={15} />
			Fontes
		</button>
	</nav>

	<p
		class="font-[family-name:var(--font-meta)] text-[0.7rem] tracking-[0.35em] uppercase text-[var(--color-ink-muted)] mb-3"
	>
		Edição pública · JSON
	</p>
	<h1
		class="font-[family-name:var(--font-display)] text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[var(--color-ink)] animate-fade-in"
	>
		Journal
	</h1>
	<p
		class="mt-3 font-[family-name:var(--font-meta)] text-sm text-[var(--color-ink-muted)] animate-fade-in"
		style="animation-delay: 80ms"
	>
		· {formatDateline(lastRefreshAt)} ·
	</p>

	{#if showCallout}
		<p
			class="mx-auto mt-5 max-w-md font-[family-name:var(--font-body)] text-lg leading-snug text-[var(--color-ink)] animate-fade-in"
			style="animation-delay: 120ms"
		>
			Um começo simples: notícias de tecnologia reunidas num só lugar, para todos lerem.
		</p>
		<p class="mt-3">
			<a
				href="{base}/#todos"
				class="font-[family-name:var(--font-meta)] text-sm text-[var(--color-accent)] hover:underline"
			>
				Ver todas as matérias →
			</a>
		</p>
	{/if}

	<div
		class="mx-auto mt-6 h-px w-full max-w-xl bg-[var(--color-rule)] animate-rule opacity-80"
		aria-hidden="true"
	></div>
</header>
