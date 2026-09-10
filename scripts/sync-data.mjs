#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import './generate-seo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(join(__dirname, '..'));
const source = join(ROOT, 'data');
const staticDir = join(ROOT, 'app', 'static');
const target = join(staticDir, 'data');

if (!existsSync(source)) {
	throw new Error(`Missing data directory: ${source}`);
}

const resolvedTarget = resolve(target);
const allowedPrefix = `${resolve(staticDir)}${process.platform === 'win32' ? '\\' : '/'}`;
if (!resolvedTarget.startsWith(allowedPrefix)) {
	throw new Error(`Refusing to replace unexpected path: ${resolvedTarget}`);
}

await rm(resolvedTarget, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await cp(source, resolvedTarget, { recursive: true });
await writeFile(join(staticDir, '.nojekyll'), '', 'utf8');
console.log('Synced data/ -> app/static/data');
