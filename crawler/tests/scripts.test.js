import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('root scripts', () => {
	test('cross-platform scripts do not depend on bash', () => {
		const pkg = JSON.parse(readFileSync(join(import.meta.dir, '..', '..', 'package.json'), 'utf8'));
		for (const name of ['sync-data', 'generate-seo', 'dev', 'build', 'check:app']) {
			expect(pkg.scripts[name]).toBeTruthy();
			expect(pkg.scripts[name]).not.toMatch(/\bbash\b/);
			expect(pkg.scripts[name]).not.toMatch(/\.sh\b/);
		}
	});
});
