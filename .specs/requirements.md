# Requirements — Journal

## Overview

**Journal** is a **public** news aggregation product with a **retro-minimal newspaper** reader. It collects items from RSS feeds and news websites (via scrape/crawl), normalizes them into **public JSON files**, and presents them like a quiet printed edition.

**There is no application API.** The only data interface is **public JSON files** (and optional article HTML snapshots) under `/data/**`. Anyone may open those files in a browser or `curl` them. The SvelteKit app is just one consumer of the same files. Bun crawler/CLI processes are the writers that update those files on disk.

## Goals

- Concentrate multiple news sources into one place.
- Keep the reader experience **retro-minimal**: newspaper soul, little chrome, fast and calm.
- Store and expose **everything** as public JSON files — no REST/RPC/API layer.
- Isolate heavy parsing/scraping/crawling in Bun crawler processes (not in the UI thread).
- Let the reader **reload the edition** from inside the webapp (re-fetch public JSON).
- Download each article **in full** into those JSON files (not headlines-only).
- Support **personal annotations** on articles, stored in the browser (`localStorage`).

## Non-Goals (out of scope for v1)

- Any HTTP application API (`/api/*`, GraphQL, RPC, etc.).
- User accounts, private notes, or auth walls (data and app are public by design).
- Multi-tenant isolation or per-user encrypted stores.
- Browser-triggered crawl over the network (crawl is CLI/scheduler writing files).
- Full-text archive search across historical months.
- Legal/compliance automation for every target site’s ToS.
- Native mobile apps.
- Real-time push notifications.
- AI summarization or ranking models.

---

## User Stories & Acceptance Criteria

### REQ-1 — Unified news reader

**User story:** As a reader, I want to open one minimalist page and see news from all configured sources in one list, so I do not need to visit each site.

**Acceptance criteria:**

- WHEN the app loads THEN the UI SHALL display a chronological list of items from the public unified JSON feed file.
- WHEN no items exist THEN the UI SHALL show an empty state with guidance to run a crawl / wait for data.
- WHEN an item is selected THEN the UI SHALL show title, source, published time, full article body (when present in the JSON), link to the original, and the user’s annotation UI for that item (localStorage).
- The first viewport SHALL feel like one quiet newspaper front page (masthead + headlines), not a dashboard and not a dense broadsheet.

### REQ-2 — RSS ingestion

**User story:** As an operator, I want to configure RSS/Atom feed URLs in JSON so Journal can import articles into public feed files.

**Acceptance criteria:**

- WHEN a valid RSS or Atom URL is listed in `sources.json` and a Bun crawl runs THEN the system SHALL parse the feed and write items into public feed JSON, including full article body per REQ-11.
- WHEN the feed is invalid or unreachable THEN the system SHALL record a source-level error in `jobs/status.json` without crashing.
- WHEN the same item appears again on crawl THEN the system SHALL deduplicate by stable identity (guid/id/link).

### REQ-3 — Site scrape and crawl

**User story:** As an operator, I want to point Journal at a news site listing page (via JSON config) so articles can be extracted even without a public RSS feed.

**Acceptance criteria:**

- WHEN a scrape source is configured in `sources.json` and a Bun crawl runs THEN the crawler SHALL extract article candidates and THEN download each article’s full content per REQ-11 into feed JSON.
- WHEN crawl depth > 1 is configured THEN the crawler SHALL follow allowed same-site links up to the configured depth and page budget.
- WHEN crawl limits are reached THEN the crawler SHALL stop and write partial results plus status in JSON.
- WHEN HTML structure cannot be parsed THEN the system SHALL mark the source as failed in status JSON.

### REQ-4 — Bun crawlers write JSON files

**User story:** As a reader, I want the UI to stay responsive; as an operator, I want crawls to update only public JSON files.

**Acceptance criteria:**

- Parsing of RSS/Atom and HTML scrape/crawl SHALL run in Bun crawler processes (plain JavaScript, no TypeScript), not in the browser UI.
- Crawler output SHALL be written only to files under `data/` (feeds, jobs status, optional article snapshots).
- The reader app SHALL NOT start crawls over HTTP; it SHALL only read public JSON files.
- WHEN a crawler job fails THEN the failure SHALL be isolated to that job/source and reflected in `jobs/status.json`.

### REQ-5 — Public JSON files are the only data interface

**User story:** As a reader or integrator, I want all Journal data as public JSON files so I can open them directly — with no API in between.

**Acceptance criteria:**

- The system SHALL NOT expose an application HTTP API for data or control (`/api/*` or equivalent SHALL NOT exist).
- The system SHALL persist a unified feed document compatible with a JSON Feed–inspired schema.
- Each item SHALL include at least: `id`, `url`, `title`, `date_published` (when available), `summary` (when available), full body fields when download succeeds (`content_text` and/or `content_html`), and source metadata.
- Sources and job status SHALL be public JSON files under stable paths (e.g. `/data/...`). User annotations are NOT public JSON.
- WHEN a client requests a data JSON URL THEN the static/public file server SHALL return it without authentication.
- The reader UI SHALL consume these same public JSON files via `fetch`/static URLs; it SHALL NOT scrape live HTML on the render path.
- Documentation (README) SHALL list the public JSON file paths as the **only** integration surface.

### REQ-6 — Single public concentration file

**User story:** As a user or integrator, I want one well-known public JSON file that holds the merged edition.

**Acceptance criteria:**

- There SHALL be one canonical unified feed file (e.g. `/data/feeds/unified.json`).
- Per-source feed snapshots MAY also be public under `/data/feeds/<sourceId>.json`.
- The reader’s default view SHALL use the unified feed file.
- After a successful Bun crawl, that file SHALL be updated on disk.

### REQ-7 — Source management via JSON

**User story:** As an operator, I want to add, edit, disable, and remove sources by editing the public sources JSON (or a Bun CLI that writes that file).

**Acceptance criteria:**

- Sources of type `rss` or `scrape` SHALL live in `data/sources.json`.
- Disabled sources SHALL be excluded from crawl jobs.
- Removing a source SHALL be done by updating `sources.json`; orphaned items MAY remain in feeds until cleaned up.
- The webapp MAY display sources read-only from that file; it SHALL NOT call an API to mutate sources.

### REQ-8 — In-app edition reload

**User story:** As a reader, I want a control inside the webapp that reloads the latest public JSON edition.

**Acceptance criteria:**

- The SvelteKit app SHALL expose a visible Refresh (or equivalent) action on the main reader view.
- WHEN the user activates Refresh THEN the app SHALL re-fetch the public JSON files (`unified.json`, `jobs/status.json`, `sources.json`) — cache-busting allowed.
- Refresh in the UI SHALL NOT invoke an HTTP API to start a crawl.
- The UI SHALL show `last_refresh_at` (or equivalent) from `jobs/status.json` when present.
- Updating the underlying news content SHALL be done by running the Bun crawler (CLI/scheduler), which writes new JSON files.

### REQ-9 — Retro-minimal newspaper UX

**User story:** As a reader, I want a calm interface that feels like a printed newspaper — retro in spirit, minimal in chrome.

**Acceptance criteria:**

- Visual language SHALL be **retro newspaper + minimalist**: masthead, paper/ink, one or two hairline rules, generous whitespace — not a dense multi-column broadsheet packed with ornaments.
- First viewport SHALL contain only: masthead brand **Journal**, one short edition/dateline line, one CTA group (reload / view sources), and the headline list. No stats, promos, sidebars, or secondary marketing blocks.
- Typography SHALL use distinctive Google Fonts (display masthead serif + readable body); avoid Inter, Roboto, Arial, system-ui as primary faces. Prefer fewer type sizes and weights over a busy scale.
- Color SHALL be restrained (paper tone, ink, optional single accent). Subtle paper grain is allowed; heavy textures, stickers, and decorative flourishes are not.
- Icons (Lucide) SHALL be sparse and secondary to type; no emoji as UI chrome.
- Separators: at most thin hairlines between sections/items — no card stacks, shadows, or pill clusters.
- Desktop and mobile share the same quiet language (single column is fine; optional light two-column only if it stays airy).
- UI stack SHALL be **SvelteKit** used as simply as possible (plain JavaScript, no TypeScript), plus Tailwind CSS, Lucide icons, and Google Fonts. No extra UI frameworks or state libraries unless strictly needed.

### REQ-10 — Public static data & operational constraints

**Acceptance criteria:**

- The webapp SHALL be publicly reachable (no login gate).
- All data documents under `/data/**` SHALL be publicly readable as static files.
- There SHALL be no `/api` (or equivalent) control/data API.
- Crawlers SHALL fetch origins directly from Bun and write results to `data/` files.
- Crawl/scrape and full-article downloads SHALL respect configured rate limits.
- CORS for `GET /data/**` SHOULD allow public read from other origins when feasible.

### REQ-11 — Full article download into JSON

**User story:** As a reader, I want each news item’s complete body stored in the public feed JSON so I can read it in Journal without opening the original site.

**Acceptance criteria:**

- WHEN an item is discovered THEN the Bun crawler SHALL fetch the article URL and extract the full main content into the feed JSON item.
- The system SHALL persist the full body on the item (`content_html` and/or `content_text`). Optional raw snapshot files under `data/articles/` MAY be kept.
- WHEN feed entries already include full content THEN the crawler MAY use that content and still MAY fetch the page if content is missing or truncated.
- WHEN full download fails THEN the item SHALL still be kept with metadata/summary, marked with a content status error; other items continue.
- The reader SHALL render the stored full body from JSON (sanitized HTML or text), not by live-scraping in the browser.

### REQ-12 — User annotations in localStorage

**User story:** As a reader, I want to write personal notes on a news item that stay on my device.

**Acceptance criteria:**

- Annotations SHALL be keyed by stable item `id` and stored in the browser `localStorage` (not in public `/data` JSON).
- WHEN viewing an article THEN the UI SHALL allow creating, editing, saving, and clearing a text annotation for that item.
- WHEN the feed is reloaded or crawled THEN user annotations SHALL remain (localStorage is independent of feed files).
- WHEN an annotation is cleared THEN it SHALL be removed from localStorage for that item id.
- Annotation UI SHALL stay retro-minimal.
- The app SHALL ship a Web App Manifest (`manifest.webmanifest`) linked from the document head.

---

## Requirements Traceability Summary

| ID | Title |
|----|--------|
| REQ-1 | Unified news reader |
| REQ-2 | RSS ingestion |
| REQ-3 | Site scrape and crawl |
| REQ-4 | Bun crawlers write JSON files |
| REQ-5 | Public JSON files are the only data interface |
| REQ-6 | Single public concentration file |
| REQ-7 | Source management via JSON |
| REQ-8 | In-app edition reload |
| REQ-9 | Retro-minimal newspaper UX (SvelteKit + Tailwind + Lucide + Google Fonts) |
| REQ-10 | Public static `/data/**`, no API, rate limits |
| REQ-11 | Full article download into JSON |
| REQ-12 | User annotations (localStorage) + web manifest |

## Open Decisions (resolved in design.md)

- Exact JSON schema → **Data model** in design.md.
- Full-content extraction (Readability-class in `article.js`).
- User annotations in `localStorage` via `app/src/lib/annotations.js`.
- Web App Manifest at `app/static/manifest.webmanifest`.
- Initial BR tech sources catalog (feeds + portals) locked in design.md.
