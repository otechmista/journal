<script>
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Journal</title>
	<meta name="description" content="Public JSON news edition — retro-minimal newspaper reader." />
</svelte:head>

{@render children()}
