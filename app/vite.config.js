import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { join } from 'node:path';

/** GitHub Pages project site: set BASE_PATH=/<repo>. Empty for local / user site. */
const base = process.env.BASE_PATH || '';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			paths: {
				base,
				relative: false
			},
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				fallback: 'index.html',
				strict: false
			}),
			prerender: {
				entries: ['*'],
				handleMissingId: 'warn'
			}
		})
	],
	server: {
		fs: {
			allow: [searchForWorkspaceRoot(process.cwd()), join(process.cwd(), '..')]
		}
	}
});
