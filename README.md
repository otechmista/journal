# Journal

Public, retro-minimal newspaper reader. **No application API** — edition data lives in public JSON files under [`data/`](data/). Personal notes stay in the browser (`localStorage`).

```text
Bun CLI (crawl)  →  writes data/*.json  (public edition)
SvelteKit app    →  reads /data/** + localStorage notes
Anyone           →  curl / open the same public JSON URLs
```

## Public JSON catalog

| Path | Purpose |
|------|---------|
| `/data/feeds/unified.json` | Canonical merged edition |
| `/data/feeds/<sourceId>.json` | Per-source snapshot |
| `/data/sources.json` | Source catalog |
| `/data/jobs/status.json` | Last crawl jobs / timestamp |

User annotations are **not** public JSON — they use `localStorage` key `journal.annotations.v1`.

## Web App Manifest

[`app/static/manifest.webmanifest`](app/static/manifest.webmanifest) — linked from `app.html` (`theme_color` paper/ink).

## Requirements

- [Bun](https://bun.sh) (crawler)
- Node.js + npm (SvelteKit app)

## Setup

```bash
# crawler
cd crawler && bun install

# app
cd ../app && npm install
# static/data → ../../data (symlink); recreate if missing:
#   ln -sfn ../../data static/data
```

## Crawl (writes public JSON)

```bash
cd crawler
bun run crawl                 # all enabled sources
bun run crawl -- --source src_tecnoblog
bun run crawl -- --max 5      # limit full-article downloads per source
```

## Reader app

```bash
# from repo root
bun run dev

# or
cd app && npm run dev
```

`app/static/data` is a symlink to `../data`. Vite is configured to allow that path (`server.fs.allow`). **Reload** in the UI only re-fetches public JSON (it does **not** start a crawl). Notes are edited in the article view and saved locally.

```bash
npm run build    # static site in app/build
npm run preview
```

## Tests

```bash
cd crawler && bun test
```

## Initial sources

See `.specs/design.md` — Convergência Digital (feed + portal), Tecnoblog, Canaltech, TecMundo.

## GitHub Pages & CI

Workflows in [`.github/workflows/`](.github/workflows/):

| Workflow | File | What it does |
|----------|------|----------------|
| **Deploy GitHub Pages** | `pages.yml` | Builds the static SvelteKit site and deploys to Pages |
| **Update news** | `crawl.yml` | Runs Bun crawl on a schedule (every 6h) or manually, commits `data/` |

### One-time setup on GitHub

1. Push the repo to GitHub.
2. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
3. Ensure Actions can write to the repo (default `GITHUB_TOKEN` is enough for `Update news` commits).
4. After the first successful **Deploy GitHub Pages** run, the site is at:
   - Project site: `https://<user>.github.io/<repo>/`
   - Or user site if the repo is `<user>.github.io`

`BASE_PATH` is `/<repo>` for project URLs, empty for `*.github.io` root sites, and **empty** when you use a custom subdomain (see below).

### Subdomain (ex.: `journal.camilomelo.com`)

Keep `camilomelo.com` on your personal Pages site. Put **Journal in its own repo** with Pages enabled.

1. **Cloudflare DNS** (domínio `camilomelo.com`):
   - Type: **CNAME**
   - Name: `journal`
   - Target: `<seu-user>.github.io` (ex. `camilomelo.github.io`)
   - Proxy: DNS only (cinza) no início; depois pode ligar o proxy laranja se quiser.
2. No repo do Journal → **Settings → Pages → Custom domain:** `journal.camilomelo.com`  
   (aguarde o DNS check / HTTPS).
3. No mesmo repo → **Settings → Secrets and variables → Actions → Variables:**
   - `CUSTOM_DOMAIN` = `journal.camilomelo.com`  
   (isso faz o build com `BASE_PATH` vazio e grava o arquivo `CNAME`).
4. Rode **Deploy GitHub Pages** de novo.

Resultado: `https://journal.camilomelo.com` → este app; `https://camilomelo.com` → site pessoal, sem mudança.
### Manual triggers

- Actions → **Update news** → Run workflow (optional max articles per source).
- Actions → **Deploy GitHub Pages** → Run workflow.

Local parity:

```bash
bun run crawl
bun run sync-data   # copies data/ → app/static/data
bun run build       # respects BASE_PATH if set, e.g. BASE_PATH=/journal bun run build
```
# journal
