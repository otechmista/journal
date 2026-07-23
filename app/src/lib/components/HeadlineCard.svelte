<script>
	import { base } from '$app/paths';
	import { itemSlug } from '$lib/slug.js';
	import {
		itemImage,
		itemLead,
		itemBadges,
		formatPublishedDate,
		sourceLabel
	} from '$lib/preview.js';

	let {
		item,
		sources = [],
		reference = null,
		featured = false,
		index = 0,
		selected = false
	} = $props();

	let image = $derived(itemImage(item));
	let lead = $derived(itemLead(item, featured ? 320 : 200));
	let badges = $derived(itemBadges(item, { reference }));
	let published = $derived(formatPublishedDate(item.date_published, { withTime: featured }));
	let label = $derived(sourceLabel(item._journal?.source_id, sources));
	let imageFailed = $state(false);
</script>

<article
	class="news-card animate-fade-in"
	class:is-featured={featured}
	class:is-highlighted={badges.length > 0}
	class:is-selected={selected}
	style="animation-delay: {Math.min(index * 45, 360)}ms"
>
	<a class="news-card-link" href="{base}/item/{itemSlug(item.id)}">
		<div class="news-card-media" aria-hidden={image && !imageFailed ? undefined : 'true'}>
			{#if image && !imageFailed}
				<img
					src={image}
					alt=""
					loading="lazy"
					decoding="async"
					referrerpolicy="no-referrer"
					onerror={() => (imageFailed = true)}
				/>
			{:else}
				<div class="news-card-media-fallback">
					<span class="news-card-fallback-kicker">Journal</span>
					<span class="news-card-fallback-name">{label}</span>
					<span class="news-card-fallback-rule" aria-hidden="true"></span>
					<span class="news-card-fallback-note">sem imagem</span>
				</div>
			{/if}
			{#if badges.length}
				<ul class="news-card-badges">
					{#each badges as badge (badge.id)}
						<li class="news-card-badge is-{badge.id}" title={badge.title}>{badge.label}</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="news-card-body">
			<p class="news-card-meta">
				<span class="news-card-source">
					<span class="news-card-dot" aria-hidden="true"></span>
					{label}
				</span>
				{#if published}
					<time class="news-card-date" datetime={item.date_published}>{published}</time>
				{/if}
			</p>

			<h3 class="news-card-title">{item.title}</h3>

			{#if lead}
				<p class="news-card-lead">{lead}</p>
			{/if}
		</div>
	</a>
</article>
