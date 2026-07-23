<script>
	import HeadlineCard from '$lib/components/HeadlineCard.svelte';

	let {
		items = [],
		sources = [],
		reference = null,
		selectedId = null,
		featureFirst = false
	} = $props();
</script>

{#if !items.length}
	<p
		class="py-16 text-center font-[family-name:var(--font-body)] text-[var(--color-ink-muted)] italic animate-fade-in"
	>
		Ainda não há matérias nesta edição. Rode
		<code class="font-[family-name:var(--font-meta)] text-sm">bun run crawl</code>
		em
		<code class="font-[family-name:var(--font-meta)] text-sm">crawler/</code>.
	</p>
{:else}
	<div class="card-grid">
		{#each items as item, i (item.id)}
			<HeadlineCard
				{item}
				{sources}
				{reference}
				index={i}
				featured={featureFirst && i === 0}
				selected={selectedId === item.id}
			/>
		{/each}
	</div>
{/if}
