<script>
	import { Search, X } from '@lucide/svelte';

	let {
		value = $bindable(''),
		resultCount = null,
		totalCount = null,
		placeholder = 'Buscar matérias…'
	} = $props();

	function clear() {
		value = '';
	}
</script>

<div class="edition-search">
	<label class="sr-only" for="edition-search">Buscar matérias</label>
	<div class="edition-search-field">
		<Search size={16} class="edition-search-icon" aria-hidden="true" />
		<input
			id="edition-search"
			type="search"
			class="edition-search-input"
			{placeholder}
			autocomplete="off"
			spellcheck="false"
			bind:value
		/>
		{#if value}
			<button type="button" class="edition-search-clear" onclick={clear} aria-label="Limpar busca">
				<X size={15} />
			</button>
		{/if}
	</div>
	{#if resultCount != null && totalCount != null}
		<p class="edition-search-meta" aria-live="polite">
			{#if value.trim()}
				{resultCount} de {totalCount}
				{totalCount === 1 ? 'matéria' : 'matérias'}
			{:else}
				{totalCount}
				{totalCount === 1 ? 'matéria' : 'matérias'}
			{/if}
		</p>
	{/if}
</div>
