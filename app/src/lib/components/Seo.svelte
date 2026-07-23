<script>
	import { page } from '$app/state';
	import { SITE, absoluteUrl, truncateMeta } from '$lib/site.js';

	let {
		title = SITE.name,
		description = SITE.description,
		image = '',
		type = 'website',
		path: pathOverride = '',
		noindex = false,
		jsonLd = null
	} = $props();

	function normalizePath(pathname) {
		const parts = [];
		for (const seg of String(pathname || '/').split('/')) {
			if (!seg || seg === '.') continue;
			if (seg === '..') {
				parts.pop();
				continue;
			}
			parts.push(seg);
		}
		return parts.length ? `/${parts.join('/')}` : '/';
	}

	let pageTitle = $derived(
		title === SITE.name || title.startsWith(`${SITE.name} ·`) || title.startsWith(`${SITE.name} —`)
			? title
			: `${title} · ${SITE.name}`
	);

	let desc = $derived(truncateMeta(description));
	let path = $derived(normalizePath(pathOverride || page.url.pathname || '/'));
	let canonical = $derived(absoluteUrl(path));
	let ogImage = $derived(
		image && /^https?:\/\//i.test(image) ? image : absoluteUrl(image || SITE.ogImagePath)
	);
	let jsonLdText = $derived(jsonLd ? JSON.stringify(jsonLd) : '');
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical} />
	<meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />

	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:locale" content={SITE.locale} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={desc} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:alt" content={pageTitle} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={desc} />
	<meta name="twitter:image" content={ogImage} />
	{#if SITE.twitterHandle}
		<meta name="twitter:site" content={SITE.twitterHandle} />
	{/if}

	{#if jsonLdText}
		{@html `<script type="application/ld+json">${jsonLdText.replace(/</g, '\\u003c')}</script>`}
	{/if}
</svelte:head>
