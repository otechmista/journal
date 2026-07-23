<script>
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { pageWindow } from '$lib/edition.js';

	let {
		page = 1,
		totalPages = 1,
		from = 0,
		to = 0,
		total = 0,
		onchange = undefined
	} = $props();

	let numbers = $derived(pageWindow(page, totalPages));

	function go(n) {
		const next = Math.min(Math.max(1, n), totalPages);
		if (next === page) return;
		onchange?.(next);
	}
</script>

{#if totalPages > 1}
	<nav class="edition-pager" aria-label="Paginação">
		<p class="edition-pager-meta">
			{from}–{to} de {total}
		</p>
		<div class="edition-pager-controls">
			<button
				type="button"
				class="edition-pager-btn"
				onclick={() => go(page - 1)}
				disabled={page <= 1}
				aria-label="Página anterior"
			>
				<ChevronLeft size={16} />
				<span>Anterior</span>
			</button>

			<ul class="edition-pager-pages">
				{#each numbers as n}
					<li>
						{#if n === '…'}
							<span class="edition-pager-ellipsis" aria-hidden="true">…</span>
						{:else}
							<button
								type="button"
								class="edition-pager-num"
								class:is-active={n === page}
								aria-current={n === page ? 'page' : undefined}
								onclick={() => go(n)}
							>
								{n}
							</button>
						{/if}
					</li>
				{/each}
			</ul>

			<button
				type="button"
				class="edition-pager-btn"
				onclick={() => go(page + 1)}
				disabled={page >= totalPages}
				aria-label="Próxima página"
			>
				<span>Próxima</span>
				<ChevronRight size={16} />
			</button>
		</div>
	</nav>
{/if}
