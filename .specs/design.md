# Design — Journal

## Purpose

Translate `.specs/requirements.md` into a concrete architecture: **Bun crawlers/CLI** (plain JS) write **public JSON files** under `data/`; a **public minimal SvelteKit** reader styled with **Tailwind CSS**, **Lucide**, and **Google Fonts** only **reads** those files. **There is no application API** — JSON files are the sole data interface.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│  Reader app (SvelteKit, minimal, read-only over data)       │
│  Tailwind CSS · Lucide · Google Fonts                       │
│  - lists unified.json                                       │
│  - Refresh = re-fetch public JSON files                     │
│  - shows article body + user notes (localStorage)           │
│  - sources view = read sources.json                         │
└─────────────────────────────▲───────────────────────────────┘
                              │ GET /data/** only (static files)
                              │
┌─────────────────────────────┴───────────────────────────────┐
│  Public static files (data/)                                │
│  sources.json · feeds/*.json · jobs/status.json             │
└─────────────────────────────▲───────────────────────────────┘
                              │ write files on disk
┌─────────────────────────────┴───────────────────────────────┐
│  Bun crawler / CLI (plain JS)                               │
│  - bun run crawl                                            │
│  - bun run crawl only (no annotation CLI)                   │
│  - rss / scrape / full article download → JSON              │
└───────────────┬─────────────────────────────────────────────┘
                │ fetch origins
                ▼
         External RSS / news sites
```

### Design principles

- **No application API** — no `/api/*`, no RPC; only public JSON (and optional HTML) files.
- **Crawlers write files; UI only reads files.**
- **Public JSON files are the product contract** — curl/browser/`fetch` the same paths.
- **Bun fetches origins directly** and persists into `data/` (REQ-10).
- **No TypeScript** in app or crawlers.
- **SvelteKit stays thin and static-friendly** — no server routes for crawl, refresh, or notes.
- **In-app Refresh (REQ-8)** = reload/re-fetch public JSON (not start a crawl).
- **Crawl / annotate / edit sources** = Bun CLI or hand-edit of JSON files.
- **No privacy pretence:** all files are world-readable.

## Stack (v1)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Reader UI | **SvelteKit** (JS skeleton, static adapter preferred) | Minimal UI over public files |
| Data access | `fetch('/data/...')` only | No API client |
| Styling | Tailwind CSS | Utility-first |
| Icons | Lucide (`lucide-svelte` or SVGs) | Sparse editorial icons |
| Typography | Google Fonts | Masthead/body serifs |
| Writers | **Bun** CLI + plain JavaScript | Crawl + annotate write JSON files |
| RSS/Atom | `fast-xml-parser` in Bun | |
| HTML extract | `cheerio` + Readability-class in Bun | |
| Persistence | Files under `data/` served as `/data/**` | Only interface |
| Hosting | Any static host (or Bun/static server) for app + `data/` | No API server required |

## Directory Layout

```text
journal/
├── .specs/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
├── data/                         # PUBLIC — sole data interface
│   ├── sources.json
│   ├── jobs/
│   │   └── status.json
│   ├── feeds/
│   │   ├── unified.json
│   │   └── <sourceId>.json
│   └── articles/                 # optional raw HTML snapshots
│       └── <hash>.html
├── app/                          # SvelteKit reader (read-only)
│   ├── src/
│   │   ├── app.css
│   │   ├── app.html
│   │   ├── lib/
│   │   │   ├── data.js           # fetch public JSON files only
│   │   │   └── components/
│   │   │       ├── Masthead.svelte
│   │   │       ├── HeadlineList.svelte
│   │   │       ├── ArticleView.svelte
│   │   │       ├── AnnotationView.svelte  # localStorage editor
│   │   │       └── SourcesPanel.svelte   # read-only
│   │   └── routes/
│   │       ├── +layout.svelte
│   │       └── +page.svelte
│   ├── static/
│   │   └── data -> ../../data    # or copy/symlink in deploy
│   ├── package.json
│   ├── svelte.config.js
│   └── vite.config.js
├── crawler/                      # Bun writers (CLI)
│   ├── index.js                  # crawl CLI
│   ├── lib/
│   │   ├── feed.js
│   │   ├── sources.js
│   │   ├── jobs.js
│   │   ├── rss.js
│   │   ├── scrape.js
│   │   └── article.js
│   ├── fixtures/
│   └── package.json
└── README.md
```

## Visual direction — retro minimal newspaper

Intentional brand look: a **quiet printed newspaper** — retro in type and paper, **minimal** in structure. Think one elegant front page, not a crowded newsroom collage.

### Mood

- Morning paper, stripped down: masthead, ink, a few rules, lots of air.
- Retro without costume: no blackletter overload, no clipart, no sepia-everything.
- Minimal without going sterile SaaS: still paper, serif, and editorial hierarchy.

### Principles

1. **Fewer elements.** If it is not masthead, dateline, actions, or a headline row, cut it.
2. **Type does the work.** Hierarchy from size/weight, not boxes and badges.
3. **Whitespace is structure.** Prefer empty paper over extra columns of chrome.
4. **One accent max.** Oxblood (or similar) only for rare emphasis (e.g. masthead rule), not for every link.

### Typography (Google Fonts)

| Role | Direction | Examples (pick one pair and lock it) |
|------|-----------|--------------------------------------|
| Masthead / display | One strong classic serif | Playfair Display, Libre Baskerville, Newsreader |
| Body / decks | One readable serif | Source Serif 4, Literata, EB Garamond |
| UI meta | Optional narrow sans for dateline/buttons only | Libre Franklin, IBM Plex Sans Condensed |

- Masthead **Journal** is the largest mark on the first viewport.
- Limit the type scale (e.g. masthead / headline / body / meta) — no decorative third display face.
- Avoid Inter, Roboto, Arial, system-ui as primary faces.

### Color & paper

CSS variables in `app/src/app.css` (illustrative — lock final hex in implementation):

```css
:root {
  --paper: #efe8dc;          /* light newsprint */
  --paper-deep: #e2d8c8;
  --ink: #1a1714;
  --ink-muted: #6a635a;
  --rule: #2a2622;
  --accent: #8b1e1e;         /* rare emphasis only */
  --highlight: #f6f1e7;      /* soft row focus */
}
```

- Background: soft paper + very light grain (optional, low contrast).
- Avoid: purple/indigo gradients, neon glow, multi-layer shadows, rounded-full pill clusters, dense vintage ornament.

### Layout rhythm

```text
┌──────────────────────────────────────────┐
│                                          │
│              J O U R N A L               │  ← masthead (only hero)
│                 · date ·                 │  ← quiet dateline
│ ───────────────────────────────────────  │  ← one hairline
│                                          │
│  Headline one                    source  │
│  Short deck…                             │
│                                          │
│  Headline two                    source  │
│  Short deck…                             │
│                                          │
└──────────────────────────────────────────┘
```

- Actions (Refresh / Sources): text or small Lucide icons, visually quiet — not a toolbar of chips.
- List: spacing + optional faint rule between items; **no cards**.
- Desktop: single calm column (max-width ~40–42rem) by default; two columns only if still airy.
- Mobile: same composition, stacked.
- Detail: full article body (stored), meta line, outbound link, quiet annotation area beneath (margin-note feel).
- Icons (Lucide): refresh, settings, external-link, alert — plus optional pen-line for notes affordance.

### Motion (2–3 intentional, soft)

1. Headline list fade-in on load/refresh.
2. Single masthead or rule accent on first paint.
3. Soft paper wash on row focus — no bounce/parallax.

### Anti-patterns (do not ship)

- Dense broadsheet: many columns, ornamental borders, “edition extras.”
- Dashboard tiles, stat strips, floating badges on the masthead.
- Card grids, heavy shadows, glassmorphism.
- Loud retro pastiche (wanted posters, excessive blackletter, sticker stacks).

## Data model

Logical model persisted as JSON files under `data/` and **served publicly** at `/data/**`. No SQL database and **no application API** in v1 — files are the source of truth and the only interface.

### Public JSON catalog (sole interface)

| Path | Auth | Purpose |
|------|------|---------|
| `GET /data/feeds/unified.json` | none | Canonical merged edition |
| `GET /data/feeds/<sourceId>.json` | none | Per-source snapshot |
| `GET /data/sources.json` | none | Source catalog |
| `GET /data/jobs/status.json` | none | Crawl / job status |
| `GET /data/articles/<hash>.html` | none | Optional raw snapshots |

These static files are the **only** data interface (no application API). Integrators and humans open them in a browser or via `curl`. The SvelteKit UI uses the same paths.


### Entity-relationship overview

```text
┌─────────────┐       1:N        ┌──────────────┐
│   Source    │─────────────────▶│  FeedItem    │
│ sources[]   │                  │  (in feeds)  │
└─────────────┘                  └──────┬───────┘
                                        │
                         item.id (stable string)
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐
            │ Annotation   │   │ Job (status) │   │ ArticleSnapshot │
            │ notes[id]    │   │ jobs[]       │   │ articles/*.html │
            └──────────────┘   └──────────────┘   └─────────────────┘
                                      ▲
                                      │ runs against
                                      │
                               ┌──────┴──────┐
                               │   Source    │
                               └─────────────┘
```

| Entity | File | Cardinality |
|--------|------|-------------|
| SourceCatalog | `data/sources.json` | 1 document |
| Source | `sources[]` inside catalog | N |
| Feed (unified) | `data/feeds/unified.json` | 1 canonical |
| Feed (per source) | `data/feeds/<sourceId>.json` | 0..N snapshots |
| FeedItem | `items[]` inside a Feed | N |
| AnnotationStore | `data/annotations.json` | 1 document |
| Annotation | `notes[<itemId>]` | 0..1 per item |
| JobStatusDoc | `data/jobs/status.json` | 1 document |
| Job | `jobs[]` inside status | N (recent runs) |
| ArticleSnapshot | `data/articles/<hash>.html` | optional 0..1 per download |

### Enums

| Name | Values |
|------|--------|
| `SourceType` | `rss` \| `scrape` |
| `ContentStatus` | `ok` \| `missing` \| `error` |
| `JobState` | `queued` \| `running` \| `succeeded` \| `failed` \| `cancelled` |

### Source

Configured origin of news. Written by hand-edit of `sources.json` or Bun CLI helpers — never via HTTP API.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable slug, e.g. `src_bbc` |
| `name` | string | yes | Display name |
| `type` | `SourceType` | yes | |
| `enabled` | boolean | yes | Disabled → skipped on refresh |
| `url` | string (URL) | yes | Feed URL or listing URL |
| `refresh_interval_minutes` | number | no | Hint for schedulers; crawl is CLI/cron |
| `selectors` | `ScrapeSelectors` | if `scrape` | CSS (and `@attr`) rules for listing |
| `crawl` | `CrawlConfig` | if `scrape` | Budget / politeness |

**ScrapeSelectors**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `item` | string | yes | Container per candidate |
| `title` | string | yes | |
| `link` | string | yes | May use `selector@attr` (e.g. `a@href`) |
| `summary` | string | no | |
| `date` | string | no | Prefer `@datetime` when available |
| `image` | string | no | |

**CrawlConfig**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `depth` | number | no | `1` |
| `max_pages` | number | no | `20` |
| `same_origin_only` | boolean | no | `true` |
| `delay_ms` | number | no | `500` |

**SourceCatalog** (`sources.json`)

| Field | Type | Notes |
|-------|------|-------|
| `version` | number | Schema version of this file (`1`) |
| `sources` | `Source[]` | |

### FeedItem

One news article in feed-like JSON (JSON Feed 1.1–inspired). Produced by crawlers; never stores user notes.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable identity (guid/url) — **PK logical** |
| `url` | string (URL) | yes | Canonical article URL |
| `title` | string | yes | |
| `summary` | string | no | Deck / excerpt |
| `content_text` | string | no | Full plain body when download ok |
| `content_html` | string | no | Full HTML body when download ok (sanitize in UI) |
| `image` | string (URL) | no | |
| `date_published` | string (ISO-8601) | no | |
| `date_modified` | string (ISO-8601) | no | |
| `authors` | `{ name: string }[]` | no | |
| `_journal` | `JournalMeta` | yes | Extension namespace |

**JournalMeta** (`_journal`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `source_id` | string | yes | FK → `Source.id` |
| `source_type` | `SourceType` | yes | Denormalized for UI |
| `ingested_at` | string (ISO-8601) | yes | Last successful ingest of this item |
| `content_status` | `ContentStatus` | yes | |
| `content_error` | string \| null | no | Set when `content_status = error` |
| `article_snapshot` | string \| null | no | Relative path under `data/articles/` if kept |

### Feed

| Field | Type | Notes |
|-------|------|-------|
| `version` | string | JSON Feed version URI |
| `title` | string | e.g. `Journal` or source name |
| `home_page_url` | string | |
| `feed_url` | string | Path/URL of this document |
| `description` | string | |
| `user_comment` | string | Operational note |
| `items` | `FeedItem[]` | Sorted by `date_published` desc |

- **Unified feed** (`feeds/unified.json`): merge of all sources — UI default.
- **Per-source feed** (`feeds/<sourceId>.json`): snapshot after each source job.

### Annotation (user-private)

User note keyed by `FeedItem.id`, stored in **browser `localStorage`** under key `journal.annotations.v1` (see `app/src/lib/annotations.js`). Not part of the public `/data` contract.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | yes | Empty clears the note |
| `updated_at` | string (ISO-8601) | yes | |

Map shape in localStorage: `Record<itemId, Annotation>`.

### Job

One refresh run for a source (operational, not editorial content).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Job id |
| `source_id` | string | yes | FK → `Source.id` |
| `state` | `JobState` | yes | |
| `started_at` | string (ISO-8601) | yes | |
| `finished_at` | string (ISO-8601) \| null | no | |
| `items_found` | number | no | Discovery count |
| `items_downloaded` | number | no | Full-body success count |
| `error` | string \| null | no | |

**JobStatusDoc**

| Field | Type | Notes |
|-------|------|-------|
| `last_refresh_at` | string (ISO-8601) \| null | Last global success |
| `jobs` | `Job[]` | Recent jobs (v1: keep last N or current wave) |

### ArticleSnapshot (optional)

| Field | Type | Notes |
|-------|------|-------|
| path | `data/articles/<hash>.html` | Raw fetched HTML |
| link | `FeedItem._journal.article_snapshot` | Pointer from item |

### Relationships & integrity rules

1. `FeedItem._journal.source_id` SHOULD match a `Source.id` when the source still exists; after source removal, item may remain with stale/unknown source.
2. `Annotation` key MUST equal `FeedItem.id` for the note to show in the UI; orphan notes (item gone) MAY remain until manual cleanup.
3. `Job.source_id` references `Source.id` at run time.
4. Refresh writers MAY update `feeds/*` and `jobs/status.json` only — **must not** write `annotations.json`.
5. Item identity for merge: prefer original feed guid/Atom id; else absolute `url`.

### Identity & merge rules

1. Prefer feed `guid` / Atom `id` when present.
2. Else absolute canonical `url`.
3. Merge into `unified.json` sorted by `date_published` desc (missing dates last).
4. Newer ingest with same `id` updates feed fields (including fuller `content_*`); does not duplicate.
5. Per-source snapshot written to `feeds/<sourceId>.json` before merge.
6. **Never** merge into or truncate `annotations.json` during refresh.

## Data Contracts (JSON examples)

Serialization examples of the model above. Prefer the field tables in **Data model** as the schema source of truth.

### `data/feeds/unified.json` (canonical concentration point)


```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Journal",
  "home_page_url": "/",
  "feed_url": "/data/feeds/unified.json",
  "description": "Unified local news feed",
  "user_comment": "Generated by Journal. Do not edit while a refresh job is running.",
  "items": [
    {
      "id": "https://example.com/article-1",
      "url": "https://example.com/article-1",
      "title": "Example headline",
      "summary": "Short excerpt…",
      "content_text": "Full article plain text…",
      "content_html": "<p>Full article HTML…</p>",
      "image": "https://example.com/og.jpg",
      "date_published": "2026-07-22T12:00:00Z",
      "date_modified": "2026-07-22T12:00:00Z",
      "authors": [{ "name": "Outlet Name" }],
      "_journal": {
        "source_id": "src_bbc",
        "source_type": "rss",
        "ingested_at": "2026-07-22T18:00:00Z",
        "content_status": "ok",
        "content_error": null
      }
    }
  ]
}
```

`content_status`: `ok` | `missing` | `error`. Prefer storing both `content_html` (sanitized later in UI) and `content_text`.

### `data/annotations.json` (user notes — never overwritten by refresh)

```json
{
  "version": 1,
  "notes": {
    "https://example.com/article-1": {
      "text": "Follow up on this claim.",
      "updated_at": "2026-07-22T19:00:00Z"
    }
  }
}
```

### Initial sources catalog (v1)

Locked operator list for the first `data/sources.json` seed. Tech/BR news focus.

| Kind | Name | URL |
|------|------|-----|
| FEED (`rss`) | Convergência Digital | `https://convergenciadigital.com.br/feed/` |
| FEED (`rss`) | Tecnoblog | `https://tecnoblog.net/feed/` |
| FEED (`rss`) | Canaltech | `https://canaltech.com.br/rss/` |
| PORTAL (`scrape`) | TecMundo | `https://www.tecmundo.com.br/` |
| PORTAL (`scrape`) | Convergência Digital (site) | `https://convergenciadigital.com.br/` |

Notes:

- Convergência Digital appears both as RSS and as portal scrape (listing/home) — distinct `id`s; crawl may overlap items and rely on feed-item dedupe by URL/id.
- Scrape selectors (calibrated):
  - TecMundo: `article:has(a[href*='.htm'])` + `a[href*='.htm']@title` / `@href`
  - Convergência portal: `h2.thumb-title, h2.post-title` + `a` / `a@href`
- All sources `enabled: true` in the seed unless noted otherwise.

### `data/sources.json`

```json
{
  "version": 1,
  "sources": [
    {
      "id": "src_convergencia_feed",
      "name": "Convergência Digital",
      "type": "rss",
      "enabled": true,
      "url": "https://convergenciadigital.com.br/feed/"
    },
    {
      "id": "src_tecnoblog",
      "name": "Tecnoblog",
      "type": "rss",
      "enabled": true,
      "url": "https://tecnoblog.net/feed/"
    },
    {
      "id": "src_canaltech",
      "name": "Canaltech",
      "type": "rss",
      "enabled": true,
      "url": "https://canaltech.com.br/rss/"
    },
    {
      "id": "src_tecmundo",
      "name": "TecMundo",
      "type": "scrape",
      "enabled": true,
      "url": "https://www.tecmundo.com.br/",
      "selectors": {
        "item": "article:has(a[href*='.htm'])",
        "title": "a[href*='.htm']@title",
        "link": "a[href*='.htm']@href"
      },
      "crawl": {
        "depth": 1,
        "max_pages": 5,
        "same_origin_only": true,
        "delay_ms": 500
      }
    },
    {
      "id": "src_convergencia_portal",
      "name": "Convergência Digital (portal)",
      "type": "scrape",
      "enabled": true,
      "url": "https://convergenciadigital.com.br/",
      "selectors": {
        "item": "h2.thumb-title, h2.post-title",
        "title": "a",
        "link": "a@href"
      },
      "crawl": {
        "depth": 1,
        "max_pages": 5,
        "same_origin_only": true,
        "delay_ms": 500
      }
    }
  ]
}
```

### `data/jobs/status.json`

```json
{
  "last_refresh_at": "2026-07-22T18:05:00Z",
  "jobs": [
    {
      "id": "job_…",
      "source_id": "src_bbc",
      "state": "succeeded",
      "started_at": "…",
      "finished_at": "…",
      "items_found": 42,
      "error": null
    }
  ]
}
```

### Item identity & merge rules

See **Data model → Identity & merge rules** (same rules; kept here only as a pointer for readers skimming contracts).

## Component Design

### 1. Reader app — SvelteKit read-only (REQ-1, REQ-8, REQ-9, REQ-12)

- Scaffold: SvelteKit **skeleton**, **JavaScript**, prefer **static** adapter.
- Routes: one main page (`/`) with list, article detail, read-only sources panel, annotation display.
- Components: `Masthead`, `HeadlineList`, `ArticleView`, `AnnotationView`, `SourcesPanel`.
- **`lib/data.js`:** only `fetch` of `/data/feeds/unified.json`, `/data/jobs/status.json`, `/data/sources.json` (cache-bust query on Reload).
- **`lib/annotations.js`:** user notes in `localStorage` (`journal.annotations.v1`).
- **In-app Refresh (REQ-8):** re-fetch public JSON files; update dateline from `last_refresh_at`. Does **not** start a crawl.
- Detail: sanitized `content_html` or `content_text`; show `content_status` errors.
- Annotations: `AnnotationView` editor saves/clears notes in localStorage per `item.id`.
- **Manifest:** `static/manifest.webmanifest` + icons under `static/icons/`, linked from `app.html`.

### 2. Sources (REQ-7)

- Catalog is `data/sources.json`.
- UI may list sources read-only.
- Mutations: edit the file or use a small Bun CLI that rewrites `sources.json`.

### 3. Bun crawl orchestrator (REQ-4, REQ-6, REQ-11)

- `bun run crawl` / `bun run crawl --source <id>`.
- Pipeline: discover (rss/scrape) → full article download → write `feeds/<id>.json` → merge `unified.json` → update `jobs/status.json`.
- Must **not** write `annotations.json`.
- Optional cron/systemd timer for schedules — still file writers, not an API.

### 4. RSS / scrape / article modules

Unchanged in responsibility from prior design: `rss.js`, `scrape.js`, `article.js` run inside Bun and persist into feed JSON files.

### 5. User annotations (REQ-12)

- Stored only in browser `localStorage` via `app/src/lib/annotations.js`.
- Not written by the crawler; not published under `/data`.
- UI: save / clear on the article detail view.

### 6. Public HTTP surface — static files only (REQ-5, REQ-10)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/data/**` | **Only** data interface — JSON (+ optional article HTML) |
| `GET` | `/` (app) | SvelteKit static UI |

**Forbidden in v1:** `/api/*`, GraphQL, RPC, server actions that mutate data over HTTP.

Serve `data/` as static files (symlink into `app/static/data`, CDN, nginx `alias`, etc.). CORS optional for cross-origin `GET`.

## Sequence — Update news (crawl writes files)

```text
Operator/cron → bun run crawl
Bun → discover + full download
Bun → write feeds/<id>.json, feeds/unified.json, jobs/status.json
(annotations.json untouched)
Reader (anytime) → GET /data/feeds/unified.json → render
```

## Sequence — In-app Reload

```text
User clicks Refresh in SvelteKit
UI → GET /data/feeds/unified.json?t=…
UI → GET /data/jobs/status.json?t=…
UI re-renders edition (no crawl started)
```

## Sequence — Annotate (localStorage)

```text
User opens article → UI loads note from localStorage[itemId]
User edits + Save → localStorage upsert (journal.annotations.v1)
Reload / crawl → public JSON changes; local notes unchanged
```

## Error Handling

| Failure | Behavior |
|---------|----------|
| Network error on source | Job `failed` in status.json; other sources continue |
| Invalid XML/HTML on listing | Job `failed` with parse message |
| Full article download fail | Item kept; `content_status: error` |
| Disk write fail (feed) | Keep previous unified feed; surface in CLI/status |
| Missing JSON in UI | Empty/error state; Reload retries fetch |

## Security & Ethics (v1 pragmatic)

- **Public by design:** every JSON file is world-readable.
- No accounts; no API attack surface for writes (writes require filesystem/CLI access).
- Respect crawl rate limits and page budgets.
- Sanitize `content_html` before `{@html}` in Svelte.
- Operator is responsible for ToS of crawled sites. User notes stay on-device.

## Testing Strategy

- Bun tests: RSS/Atom, scrape, article extract, merge/dedupe.
- Manual: open `/data/feeds/unified.json` in browser; run crawl; Reload in UI; annotate via CLI; Reload shows note.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Fragile HTML / paywalls | `content_status` error; keep metadata |
| Notes lost on new browser/device | Expected — localStorage is device-local |
| Expectation that UI starts crawl | Copy + README: Reload ≠ crawl; crawl is CLI/cron |
| XSS via content_html | sanitize before render |
| Stale UI after crawl | Refresh control re-fetches JSON |

## Decisions Locked

1. **No application API** — only public JSON files under `/data/**`.
2. Data model as specified above; canonical feed `/data/feeds/unified.json`.
3. **App:** public SvelteKit (JS, minimal) read-only over files; Reload re-fetches JSON.
4. **Visual identity:** retro-minimal newspaper — REQ-9.
5. **Writers:** Bun CLI (`crawl`) + hand-edit of sources JSON; user notes in localStorage.
6. Full article bodies stored in feed JSON (`content_*`).
7. **Initial sources:** Convergência Digital (feed + portal), Tecnoblog, Canaltech, TecMundo — see Initial sources catalog.
