<script>
	import { base } from '$app/paths';
	import { itemSlug } from '$lib/slug.js';

	let { items = [], selectedId = null } = $props();

	function metaLine(item) {
		const parts = [];
		if (item._journal?.source_id) parts.push(item._journal.source_id.replace(/^src_/, ''));
		if (item.date_published) {
			try {
				parts.push(
					new Date(item.date_published).toLocaleDateString('pt-BR', {
						day: '2-digit',
						month: 'short'
					})
				);
			} catch {
				/* ignore */
			}
		}
		return parts.join(' · ');
	}

	function hrefFor(item) {
		return `${base}/item/${itemSlug(item.id)}`;
	}
</script>

{#if !items.length}
	<p
		class="py-16 text-center font-[family-name:var(--font-body)] text-[var(--color-ink-muted)] italic animate-fade-in"
	>
		No stories yet. Run <code class="font-[family-name:var(--font-meta)] text-sm">bun run crawl</code> in
		<code class="font-[family-name:var(--font-meta)] text-sm">crawler/</code>.
	</p>
{:else}
	<ul class="divide-y divide-[color-mix(in_srgb,var(--color-rule)_18%,transparent)] animate-fade-in">
		{#each items as item, i (item.id)}
			<li>
				<a
					href={hrefFor(item)}
					class="block w-full text-left py-5 px-1 transition-colors hover:bg-[var(--color-highlight)] focus-visible:bg-[var(--color-highlight)] outline-none"
					class:bg-[var(--color-highlight)]={selectedId === item.id}
					style="animation-delay: {Math.min(i * 40, 400)}ms"
				>
					<div class="flex items-baseline justify-between gap-4">
						<h2
							class="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-snug text-[var(--color-ink)]"
						>
							{item.title}
						</h2>
						<span
							class="shrink-0 font-[family-name:var(--font-meta)] text-[0.7rem] uppercase tracking-wide text-[var(--color-ink-muted)]"
						>
							{metaLine(item)}
						</span>
					</div>
					{#if item.summary}
						<p class="mt-2 text-[var(--color-ink-muted)] leading-relaxed line-clamp-2">
							{item.summary}
						</p>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
