<script>
	import { base } from '$app/paths';
	import { SITE, absoluteUrl, truncateMeta } from '$lib/site.js';
	import { itemSlug } from '$lib/slug.js';
	import Seo from '$lib/components/Seo.svelte';
	import ArticleView from '$lib/components/ArticleView.svelte';
	import AnnotationView from '$lib/components/AnnotationView.svelte';

	let { data } = $props();

	let item = $derived(data.item);
	let status = $derived(data.status);
	let notFound = $derived(data.notFound);
	let loadError = $derived(data.error || null);

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

	let description = $derived(
		item
			? truncateMeta(item.summary || item.content_text || item.title || SITE.description)
			: `Matéria não encontrada. Última atualização: ${formatLastUpdate(status?.last_refresh_at)}.`
	);

	let ogImage = $derived(item?.image || '');
	let seoPath = $derived(item ? `/item/${itemSlug(item.id)}` : '/item/nao-encontrada');

	let jsonLd = $derived(
		item
			? {
					'@context': 'https://schema.org',
					'@type': 'NewsArticle',
					headline: item.title,
					description,
					datePublished: item.date_published || undefined,
					dateModified: item.date_modified || item.date_published || undefined,
					mainEntityOfPage: absoluteUrl(`/item/${itemSlug(item.id)}`),
					isPartOf: {
						'@type': 'WebSite',
						name: SITE.name,
						url: absoluteUrl('/')
					},
					author: (item.authors || []).map((a) => ({
						'@type': 'Person',
						name: a.name
					})),
					publisher: {
						'@type': 'Organization',
						name: SITE.name,
						url: absoluteUrl('/'),
						logo: {
							'@type': 'ImageObject',
							url: absoluteUrl('/icons/icon-512.png')
						}
					},
					image: item.image ? [item.image] : [absoluteUrl(SITE.ogImagePath)],
					url: item.url
				}
			: null
	);
</script>

{#if item}
	<Seo
		title={item.title}
		{description}
		image={ogImage}
		type="article"
		path={seoPath}
		jsonLd={jsonLd}
	/>
{:else}
	<Seo
		title="Matéria não encontrada"
		{description}
		type="website"
		path={seoPath}
		noindex={true}
	/>
{/if}

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

	{#if loadError}
		<p class="text-[var(--color-accent)] leading-relaxed" role="alert">{loadError}</p>
	{:else if notFound || !item}
		<p class="text-[var(--color-accent)] leading-relaxed" role="alert">
			Matéria não encontrada na edição atual. Última atualização: {formatLastUpdate(
				status?.last_refresh_at
			)}. Volte à lista ou aguarde o próximo crawl.
		</p>
		<p class="mt-6">
			<a href="{base}/#todos" class="text-[var(--color-accent)] hover:underline"
				>Ver todas as matérias</a
			>
		</p>
	{:else}
		<ArticleView {item} />
		<AnnotationView itemId={item.id} />
	{/if}
</main>
