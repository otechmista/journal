<script>
	import { browser } from '$app/environment';
	import { ExternalLink } from '@lucide/svelte';
	import DOMPurify from 'dompurify';
	import { cleanContentHtml, cleanContentText } from '$lib/clean.js';

	let { item = null } = $props();

	function sanitizeHtml(html) {
		const cleaned = cleanContentHtml(html);
		if (browser) {
			return DOMPurify.sanitize(cleaned, { ADD_ATTR: ['target', 'rel'] });
		}
		// Trusted crawled HTML for prerender — strip obvious active content
		return cleaned
			.replace(/<script[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?<\/style>/gi, '')
			.replace(/<\/?(?:iframe|object|embed|form)[^>]*>/gi, '')
			.replace(/\son[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi, '');
	}

	let safeHtml = $derived(item?.content_html ? sanitizeHtml(item.content_html) : '');
	let safeText = $derived(item?.content_text ? cleanContentText(item.content_text) : '');

	function sourceLabel(id) {
		if (!id) return 'fonte';
		return String(id).replace(/^src_/, '').replace(/_/g, ' ');
	}
</script>

{#if !item}
	<p class="text-[var(--color-ink-muted)] italic py-8">Selecione uma manchete para ler.</p>
{:else}
	<article class="article-sheet animate-fade-in">
		<header class="article-header">
			<p class="article-kicker">
				<span>{sourceLabel(item._journal?.source_id)}</span>
				{#if item.date_published}
					<span class="article-kicker-sep" aria-hidden="true">·</span>
					<time datetime={item.date_published}>
						{new Date(item.date_published).toLocaleString('pt-BR', {
							dateStyle: 'long',
							timeStyle: 'short'
						})}
					</time>
				{/if}
			</p>

			<h1 class="article-title">{item.title}</h1>

			<p class="article-original">
				<a
					href={item.url}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2"
				>
					Ler no site original
					<ExternalLink size={14} />
				</a>
			</p>
		</header>

		<div class="article-rule" aria-hidden="true"></div>

		{#if item._journal?.content_status === 'error'}
			<p class="mt-8 text-[var(--color-accent)]">
				Texto completo indisponível{item._journal.content_error
					? `: ${item._journal.content_error}`
					: '.'}
			</p>
			{#if item.summary}
				<p class="mt-4 text-[var(--color-ink-muted)] leading-relaxed">{item.summary}</p>
			{/if}
		{:else if safeHtml}
			<div class="prose-article">{@html safeHtml}</div>
		{:else if safeText}
			<div class="prose-article whitespace-pre-wrap">{safeText}</div>
		{:else}
			<p class="mt-8 text-[var(--color-ink-muted)] italic">Corpo ainda não baixado.</p>
			{#if item.summary}
				<p class="mt-4 leading-relaxed">{item.summary}</p>
			{/if}
		{/if}
	</article>
{/if}
