<script>
	import { resolve } from '$app/paths';
	import { SITE, absoluteUrl } from '$lib/site.js';
	import { withBase } from '$lib/data.js';
	import Seo from '$lib/components/Seo.svelte';
	import Masthead from '$lib/components/Masthead.svelte';

	let { data } = $props();

	let sources = $derived((data.sources?.sources || []).filter((s) => s.enabled !== false));
	let designSources = $derived(sources.filter((s) => s.topic === 'design'));
	let otherSources = $derived(sources.filter((s) => s.topic !== 'design'));
	let itemCount = $derived(data.feed?.items?.length || 0);
	let status = $derived(data.status);
	let error = $derived(data.error || null);

	const editionHref = `${resolve('/')}#edicao`;
	const jsonUrl = withBase('/data/feeds/unified.json');

	let jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'AboutPage',
		name: `Sobre · ${SITE.name}`,
		description: SITE.description,
		url: absoluteUrl('/sobre'),
		isPartOf: {
			'@type': 'WebSite',
			name: SITE.name,
			url: absoluteUrl('/')
		}
	});
</script>

<Seo
	title={`Sobre · ${SITE.name}`}
	description="O que é o Journal: como a edição pública funciona, de onde vêm as notícias e como usar o JSON."
	type="website"
	path="/sobre"
	jsonLd={jsonLd}
/>

<main class="mx-auto max-w-3xl px-4 pb-20">
	<Masthead lastRefreshAt={status?.last_refresh_at} showCallout={false} />

	{#if error}
		<p class="text-center text-[var(--color-accent)] text-sm mb-6" role="alert">{error}</p>
	{/if}

	<article class="about-page animate-fade-in">
		<h2 class="about-title">Sobre o projeto</h2>
		<p class="about-lead">
			O Journal reúne notícias de tecnologia e UX/UI num só lugar — no estilo de um jornal impresso,
			com edição pública em JSON e anotações só no seu navegador.
		</p>

		<section class="about-section">
			<h3>Como funciona</h3>
			<ol class="about-steps">
				<li>
					<strong>Crawl</strong> — um CLI em Bun lê as fontes cadastradas e grava snapshots em
					<code>data/*.json</code>.
				</li>
				<li>
					<strong>Edição pública</strong> — qualquer pessoa pode abrir ou baixar o mesmo JSON (sem
					API de aplicação).
				</li>
				<li>
					<strong>Leitor</strong> — o app SvelteKit monta a edição, filtros por assunto e a leitura
					de cada matéria.
				</li>
			</ol>
			<p class="about-note">
				Notas pessoais ficam em <code>localStorage</code> e não entram no JSON público.
			</p>
		</section>

		<section class="about-section">
			<h3>Nesta edição</h3>
			<p>
				{itemCount} matérias disponíveis.
				<a href={editionHref} class="about-link">Ir para a lista →</a>
				·
				<a href={jsonUrl} target="_blank" rel="noopener noreferrer" class="about-link"
					>Abrir unified.json</a
				>
			</p>
		</section>

		<section class="about-section">
			<h3>Fontes</h3>
			<p class="about-note">
				Catálogo em <code>data/sources.json</code>. Para atualizar: edite o arquivo e rode
				<code>bun run crawl</code>.
			</p>

			{#if designSources.length}
				<h4 class="about-subhead">Design &amp; UX</h4>
				<ul class="about-sources">
					{#each designSources as s (s.id)}
						<li>
							<span class="about-source-name">{s.name}</span>
							<a href={s.url} target="_blank" rel="noopener noreferrer" class="about-source-url"
								>{s.url}</a
							>
						</li>
					{/each}
				</ul>
			{/if}

			{#if otherSources.length}
				<h4 class="about-subhead">Tecnologia</h4>
				<ul class="about-sources">
					{#each otherSources as s (s.id)}
						<li>
							<span class="about-source-name">{s.name}</span>
							<a href={s.url} target="_blank" rel="noopener noreferrer" class="about-source-url"
								>{s.url}</a
							>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</article>
</main>
