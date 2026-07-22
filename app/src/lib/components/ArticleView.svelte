<script>
	import { ExternalLink } from '@lucide/svelte';
	import DOMPurify from 'isomorphic-dompurify';

	let { item = null } = $props();

	let safeHtml = $derived(item?.content_html ? DOMPurify.sanitize(item.content_html) : '');
</script>

{#if !item}
	<p class="text-[var(--color-ink-muted)] italic py-8">Select a headline to read.</p>
{:else}
	<article class="animate-fade-in">
		<h1
			class="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold leading-tight text-[var(--color-ink)]"
		>
			{item.title}
		</h1>
		<p
			class="mt-3 font-[family-name:var(--font-meta)] text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]"
		>
			{item._journal?.source_id || 'source'}
			{#if item.date_published}
				· {new Date(item.date_published).toLocaleString('pt-BR')}
			{/if}
			{#if item._journal?.content_status && item._journal.content_status !== 'ok'}
				· content {item._journal.content_status}
			{/if}
		</p>

		<p class="mt-5">
			<a
				href={item.url}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 font-[family-name:var(--font-meta)] text-sm font-medium text-[var(--color-accent)] hover:underline"
			>
				Abrir artigo original
				<ExternalLink size={14} />
			</a>
		</p>

		<div class="mt-5 h-px w-full bg-[var(--color-rule)] opacity-70" aria-hidden="true"></div>

		{#if item._journal?.content_status === 'error'}
			<p class="mt-6 text-[var(--color-accent)]">
				Texto completo indisponível{item._journal.content_error
					? `: ${item._journal.content_error}`
					: '.'}
			</p>
			{#if item.summary}
				<p class="mt-4 text-[var(--color-ink-muted)]">{item.summary}</p>
			{/if}
		{:else if safeHtml}
			<div class="prose-article mt-6">{@html safeHtml}</div>
		{:else if item.content_text}
			<div class="prose-article mt-6 whitespace-pre-wrap">{item.content_text}</div>
		{:else}
			<p class="mt-6 text-[var(--color-ink-muted)] italic">Corpo ainda não baixado.</p>
			{#if item.summary}
				<p class="mt-4">{item.summary}</p>
			{/if}
		{/if}

		<p class="mt-10 pt-6 border-t border-[color-mix(in_srgb,var(--color-rule)_25%,transparent)]">
			<a
				href={item.url}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 font-[family-name:var(--font-meta)] text-sm text-[var(--color-accent)] hover:underline"
			>
				Ler no site original
				<ExternalLink size={14} />
			</a>
		</p>
	</article>
{/if}
