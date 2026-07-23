<script>
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { SITE, absoluteUrl, truncateMeta } from '$lib/site.js';
	import { itemSlug } from '$lib/slug.js';
	import { filterItems, paginateItems } from '$lib/edition.js';
	import Seo from '$lib/components/Seo.svelte';
	import Masthead from '$lib/components/Masthead.svelte';
	import HeadlineGrid from '$lib/components/HeadlineGrid.svelte';
	import HeadlineList from '$lib/components/HeadlineList.svelte';
	import TopicTabs from '$lib/components/TopicTabs.svelte';
	import {
		editionReference,
		filterByTopic,
		sourceTopicMap,
		topicTabs,
		itemImage
	} from '$lib/preview.js';
	import SourcesPanel from '$lib/components/SourcesPanel.svelte';
	import EditionSearch from '$lib/components/EditionSearch.svelte';
	import EditionPager from '$lib/components/EditionPager.svelte';
	import { onMount } from 'svelte';

	const PAGE_SIZE = 12;
	const HIGHLIGHT_COUNT = 3;

	let { data } = $props();

	let feed = $derived(data.feed);
	let status = $derived(data.status);
	let sources = $derived(data.sources);
	let error = $derived(data.error || null);
	let sourcesOpen = $state(false);

	let query = $state('');
	let tab = $state('todos');
	let pageNum = $state(1);
	let synced = $state(false);
	let lastQuery = $state('');
	let lastTab = $state('todos');

	onMount(() => {
		const params = page.url.searchParams;
		query = params.get('q') || '';
		lastQuery = query;
		tab = params.get('tab') || 'todos';
		lastTab = tab;
		pageNum = Math.max(1, Number(params.get('page') || '1') || 1);
		synced = true;
	});

	let allItems = $derived(feed.items || []);
	let sourceList = $derived(sources.sources || []);
	let sourceTopics = $derived(sourceTopicMap(sourceList));
	let reference = $derived(status?.last_refresh_at || editionReference(allItems));

	let tabs = $derived(topicTabs(allItems, { sourceTopics }));
	// Guard against a stale tab from the URL that has no items in this edition.
	let activeTab = $derived(tabs.some((t) => t.id === tab) ? tab : 'todos');

	let inTopic = $derived(filterByTopic(allItems, activeTab, { sourceTopics }));
	let filtered = $derived(filterItems(inTopic, query));
	let browsing = $derived(!query.trim());

	// 3 image-led highlights (newest first) when simply browsing a tab.
	let highlights = $derived(
		browsing ? filtered.filter((item) => itemImage(item)).slice(0, HIGHLIGHT_COUNT) : []
	);
	let highlightIds = $derived(new Set(highlights.map((i) => i.id)));
	let listItems = $derived(filtered.filter((item) => !highlightIds.has(item.id)));
	let paged = $derived(paginateItems(listItems, pageNum, PAGE_SIZE));

	$effect(() => {
		if (query !== lastQuery || activeTab !== lastTab) {
			lastQuery = query;
			lastTab = activeTab;
			if (pageNum !== 1) pageNum = 1;
		}
	});

	$effect(() => {
		if (pageNum !== paged.page) pageNum = paged.page;
	});

	$effect(() => {
		if (!browser || !synced) return;
		const q = query.trim();
		const params = new URLSearchParams();
		if (q) params.set('q', q);
		if (activeTab && activeTab !== 'todos') params.set('tab', activeTab);
		if (pageNum > 1) params.set('page', String(pageNum));
		const qs = params.toString();
		const next = `${page.url.pathname}${qs ? `?${qs}` : ''}`;
		const current = `${page.url.pathname}${page.url.search}`;
		if (next !== current) replaceState(next, {});
	});

	function onTabChange(id) {
		tab = id;
	}

	function onPageChange(n) {
		pageNum = n;
		queueMicrotask(() => {
			document.getElementById('edicao')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}

	let jsonLd = $derived({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				name: SITE.name,
				url: absoluteUrl('/'),
				description: SITE.description,
				inLanguage: SITE.language,
				potentialAction: {
					'@type': 'SearchAction',
					target: {
						'@type': 'EntryPoint',
						urlTemplate: `${absoluteUrl('/')}?q={search_term_string}`
					},
					'query-input': 'required name=search_term_string'
				}
			},
			{
				'@type': 'CollectionPage',
				name: SITE.name,
				description: SITE.description,
				url: absoluteUrl('/'),
				isPartOf: { '@type': 'WebSite', name: SITE.name, url: absoluteUrl('/') },
				about: 'Notícias de tecnologia',
				mainEntity: {
					'@type': 'ItemList',
					numberOfItems: allItems.length,
					itemListElement: allItems.slice(0, 20).map((item, i) => ({
						'@type': 'ListItem',
						position: i + 1,
						url: absoluteUrl(`/item/${itemSlug(item.id)}`),
						name: item.title
					}))
				}
			}
		]
	});

	let homeDescription = $derived(
		status?.last_refresh_at
			? truncateMeta(
					`${SITE.description} Última edição: ${new Date(status.last_refresh_at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}.`
				)
			: SITE.description
	);
</script>

<Seo title={SITE.name} description={homeDescription} type="website" path="/" jsonLd={jsonLd} />

<main class="mx-auto max-w-5xl px-4 pb-20">
	<Masthead
		lastRefreshAt={status.last_refresh_at}
		{sourcesOpen}
		showCallout={true}
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

	<section id="edicao" class="scroll-mt-6">
		<div class="mb-5">
			<EditionSearch
				bind:value={query}
				resultCount={filtered.length}
				totalCount={inTopic.length}
			/>
		</div>

		<TopicTabs {tabs} active={activeTab} onchange={onTabChange} />

		{#if filtered.length === 0}
			<p class="py-14 text-center text-[var(--color-ink-muted)] italic">
				{#if query.trim()}
					Nenhuma matéria encontrada para “{query.trim()}”.
				{:else}
					Ainda não há matérias nesta seção.
				{/if}
			</p>
		{:else}
			{#if highlights.length}
				<div class="mb-8">
					<h2 class="section-heading mb-5">
						<span class="section-heading-accent">Destaques</span>
						<span>as principais desta seção</span>
					</h2>
					<HeadlineGrid items={highlights} sources={sourceList} {reference} />
				</div>
			{/if}

			{#if paged.items.length}
				<h2 class="section-heading mb-5">
					<span class="section-heading-accent">
						{#if query.trim()}Resultados{:else}Mais matérias{/if}
					</span>
					<span>{paged.total} no total</span>
				</h2>
				<HeadlineList items={paged.items} sources={sourceList} {reference} />
				<EditionPager
					page={paged.page}
					totalPages={paged.totalPages}
					from={paged.from}
					to={paged.to}
					total={paged.total}
					onchange={onPageChange}
				/>
			{/if}
		{/if}
	</section>
</main>
