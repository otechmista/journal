<script>
	let { sources = [], open = false } = $props();
</script>

{#if open}
	<aside
		class="mt-6 mb-2 px-1 py-4 border-y border-[color-mix(in_srgb,var(--color-rule)_25%,transparent)] animate-fade-in"
	>
		<h2
			class="font-[family-name:var(--font-meta)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-ink-muted)] mb-3"
		>
			Sources (read-only)
		</h2>
		<ul class="space-y-2">
			{#each sources as s (s.id)}
				<li class="font-[family-name:var(--font-body)] text-sm">
					<span class="font-semibold text-[var(--color-ink)]">{s.name}</span>
					<span class="text-[var(--color-ink-muted)]">
						· {s.type}{s.enabled ? '' : ' · disabled'}
					</span>
					<br />
					<a
						href={s.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[var(--color-accent)] text-xs break-all hover:underline"
					>
						{s.url}
					</a>
				</li>
			{/each}
		</ul>
		<p class="mt-4 text-xs text-[var(--color-ink-muted)] font-[family-name:var(--font-meta)]">
			Edit <code>data/sources.json</code> then run <code>bun run crawl</code>. No HTTP API.
		</p>
	</aside>
{/if}
