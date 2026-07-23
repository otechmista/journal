<script>
	let { tabs = [], active = 'todos', onchange = undefined } = $props();
</script>

{#if tabs.length > 1}
	<div class="topic-tabs" role="tablist" aria-label="Filtrar por assunto">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				aria-selected={active === tab.id}
				class="topic-tab"
				class:is-active={active === tab.id}
				onclick={() => onchange?.(tab.id)}
			>
				{tab.label}
				<span class="topic-tab-count">{tab.count}</span>
			</button>
		{/each}
	</div>
{/if}
