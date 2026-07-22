# Tasks — Journal

Ordered implementation plan. Each task maps to requirements in `.specs/requirements.md` and follows `.specs/design.md`.

Stack locked: **app** = minimal SvelteKit (JS) reading public JSON; **crawlers** = Bun CLI writing JSON files; **no HTTP API**.

Mark progress with `[ ]` / `[x]`.

---

## Phase 0 — Spec & project skeleton

### T0.1 — Confirm spec location
- [x] Keep SDD artifacts under `.specs/` (`requirements.md`, `design.md`, `tasks.md`).
- **Reqs:** process

### T0.2 — Scaffold folders
- [x] Create `app/` (SvelteKit JS skeleton, static-friendly) and `crawler/` (Bun).
- [x] Shared public `data/` with seed JSON files.
- [x] Wire `data/` into the app as static `/data/**` (symlink or copy strategy).
- [x] `.gitignore` for `node_modules`, `.svelte-kit`, etc.
- **Reqs:** REQ-5, REQ-9, REQ-10
- **Done when:** app serves `/data/feeds/unified.json` as a static file; no `/api` routes exist.

### T0.3 — Seed JSON contracts
- [x] Seed `sources.json` with the **Initial sources catalog** from design.md (3 RSS + 2 portals).
- [x] Seed empty/skeleton `feeds/unified.json`, `jobs/status.json`.
- [x] JSDoc shapes in crawler libs (`content_*`).
- **Reqs:** REQ-5, REQ-6, REQ-7, REQ-11, REQ-12
- **Done when:** seeds match **Data model** + initial portal/feed list in design.md.

---

## Phase 1 — Bun writers (CLI → JSON files)

### T1.1 — Feed library
- [x] `crawler/lib/feed.js`: normalize, id, merge, sort.
- [x] Tests: dedupe, ordering, content fields.
- **Reqs:** REQ-2, REQ-5, REQ-6, REQ-11

### T1.2 — RSS/Atom
- [x] `crawler/lib/rss.js` + fixtures.
- **Reqs:** REQ-2, REQ-4

### T1.3 — Scrape discovery
- [x] `crawler/lib/scrape.js` with budgets/cancel.
- [x] Calibrate selectors for TecMundo and Convergência Digital portal (replace `[TO CALIBRATE]`).
- **Reqs:** REQ-3, REQ-4, REQ-10
- **Done when:** HTML fixtures / live listing yield items for both portals.

### T1.4 — Full article download
- [x] `crawler/lib/article.js` → `content_html` / `content_text` / `content_status`.
- **Reqs:** REQ-11, REQ-10

### T1.5 — Crawl CLI + writers
- [x] `bun run crawl` / `--source <id>` → discover → download → write feed JSON + `status.json`.
- [x] Must not write `annotations.json`.
- **Reqs:** REQ-4, REQ-6, REQ-8, REQ-11, REQ-12
- **Done when:** CLI crawl updates `/data/feeds/unified.json` on disk.

### T1.6 — Annotate CLI
- [x] ~~Public annotate CLI~~ — superseded: user notes use localStorage (REQ-12).
- **Reqs:** REQ-12

### T1.7 — Explicitly no API
- [x] Confirm repo has no `/api` routes or control HTTP handlers.
- [x] README documents JSON paths as the only integration surface + CLI crawl.
- **Reqs:** REQ-5, REQ-10

---

## Phase 2 — Reader app (JSON fetch only)

### T2.1 — App shell + retro-minimal tokens
- [x] Tailwind, Google Fonts, Lucide; paper/ink tokens; masthead composition.
- **Reqs:** REQ-1, REQ-9

### T2.2 — Load public JSON + Reload control
- [x] `lib/data.js` fetches `/data/feeds/unified.json`, status, sources.
- [x] Refresh button re-fetches JSON (cache-bust); does **not** start crawl.
- [x] Show `last_refresh_at` from status file.
- **Reqs:** REQ-5, REQ-8
- **Done when:** Reload updates UI after a manual CLI crawl without restarting the app.

### T2.3 — Full article view
- [x] Render sanitized body from feed JSON; handle `content_status`.
- **Reqs:** REQ-1, REQ-11

### T2.4 — Annotations (localStorage)
- [x] Editor on article detail; save/clear via `localStorage`.
- [x] Independent of crawl/reload of public JSON.
- **Reqs:** REQ-12, REQ-9

### T2.5 — Sources panel (read-only)
- [x] List `sources.json`; point operators to edit file / CLI for changes.
- **Reqs:** REQ-7, REQ-9

### T2.6 — Static wiring + manifest
- [x] Ensure production/dev serve app + `/data/**` as static files only.
- [x] Web App Manifest + icons linked from `app.html`.
- **Reqs:** REQ-10, REQ-12

---

## Phase 3 — Hardening

### T3.1 — Failure isolation
- [x] Bad source/article does not block others; status JSON + UI reflect errors.
- **Reqs:** REQ-2, REQ-3, REQ-4, REQ-11

### T3.2 — Smoke checklist
- [x] README: public JSON catalog, `bun run crawl`, Reload in UI, localStorage notes, manifest, no API.
- [x] Manual: open unified.json; crawl; Reload UI; save note locally; retro-minimal look.
- **Reqs:** REQ-1–REQ-12

---

## Suggested order

`T0.2 → T0.3 → T1.1 → T1.2 → T1.3 → T1.4 → T1.5 → T1.6 → T1.7 → T2.1 → T2.2 → T2.3 → T2.4 → T2.5 → T2.6 → T3.1 → T3.2`

## Out of scope reminders

- **No `/api` or other application HTTP APIs.**
- No TypeScript.
- Public edition JSON via Bun CLI / hand-edit; user notes in localStorage only.
- `/data/**` remains public edition data (not private notes).
