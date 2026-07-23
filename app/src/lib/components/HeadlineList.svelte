<script>
	import { resolve } from '$app/paths';
	import { itemSlug } from '$lib/slug.js';
	import { itemImage, itemLead, itemBadges, formatPublishedDate, sourceLabel } from '$lib/preview.js';

	let { items = [], sources = [], reference = null, selectedId = null } = $props();
</script>

{#if items.length}
	<ul class="headline-list animate-fade-in">
		{#each items as item, i (item.id)}
			{@const image = itemImage(item)}
			{@const badges = itemBadges(item, { reference })}
			<li>
				<a
					class="headline-row"
					class:is-selected={selectedId === item.id}
					href={resolve(`/item/${itemSlug(item.id)}`)}
					style="animation-delay: {Math.min(i * 25, 300)}ms"
				>
					<div class="headline-thumb" class:is-empty={!image}>
						{#if image}
							<img
								src={image}
								alt=""
								loading="lazy"
								decoding="async"
								referrerpolicy="no-referrer"
							/>
						{:else}
							<span aria-hidden="true">{sourceLabel(item._journal?.source_id, sources).charAt(0)}</span>
						{/if}
					</div>

					<div class="headline-row-body">
						<p class="headline-row-meta">
							<span class="headline-row-source">
								<span class="news-card-dot" aria-hidden="true"></span>
								{sourceLabel(item._journal?.source_id, sources)}
							</span>
							{#if item.date_published}
								<span class="headline-row-sep" aria-hidden="true">·</span>
								<time datetime={item.date_published}>{formatPublishedDate(item.date_published)}</time>
							{/if}
							{#each badges as badge (badge.id)}
								<span class="headline-row-badge is-{badge.id}" title={badge.title}>{badge.label}</span>
							{/each}
						</p>

						<h3 class="headline-row-title">{item.title}</h3>

						{#if itemLead(item, 160)}
							<p class="headline-row-lead">{itemLead(item, 160)}</p>
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
