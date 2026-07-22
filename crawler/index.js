#!/usr/bin/env bun
import { runCrawl } from './lib/jobs.js';

function parseArgs(argv) {
	/** @type {{ sourceId?: string, maxArticles?: number, saveSnapshot?: boolean }} */
	const opts = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--source' || a === '-s') opts.sourceId = argv[++i];
		else if (a === '--max' || a === '--max-articles') opts.maxArticles = Number(argv[++i]);
		else if (a === '--snapshot') opts.saveSnapshot = true;
		else if (a === '--help' || a === '-h') opts.help = true;
	}
	return opts;
}

const opts = parseArgs(Bun.argv.slice(2));
if (opts.help) {
	console.log(`Usage: bun run crawl [--source <id>] [--max <n>] [--snapshot]

Writes public JSON under ../data/ (feeds, jobs/status). Does not touch annotations.json.`);
	process.exit(0);
}

console.log('Journal crawl starting…');
const result = await runCrawl(opts);
console.log(`Done. unified items=${result.itemCount}; jobs=${result.jobs.length}`);
const failed = result.jobs.filter((j) => j.state === 'failed');
process.exit(failed.length && failed.length === result.jobs.length ? 1 : 0);
