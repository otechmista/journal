import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { join } from 'node:path';

/** GitHub Pages: BASE_PATH=/<repo> for *.github.io/<repo>; empty for custom domain root. */
const base = process.env.BASE_PATH || '';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			paths: {
				base,
				// Relative asset URLs avoid white-screen when domain vs /repo mismatch during setup
				relative: true
			},
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				fallback: '404.html',
				strict: false
			}),
			prerender: {
				entries: ['*'],
				handleMissingId: 'warn',
				handleHttpError: 'warn'
			}
		})
	],
	server: {
		fs: {
			allow: [searchForWorkspaceRoot(process.cwd()), join(process.cwd(), '..')]
		}
	}
});
