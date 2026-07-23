#!/usr/bin/env bash
# Generate robots.txt + sitemap.xml for SEO (reads CNAME / PUBLIC_SITE_URL).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATIC="$ROOT/app/static"
DATA="$ROOT/data/feeds/unified.json"

ORIGIN="${PUBLIC_SITE_URL:-}"
if [ -z "$ORIGIN" ] && [ -f "$STATIC/CNAME" ]; then
  ORIGIN="https://$(tr -d '[:space:]' < "$STATIC/CNAME")"
fi
ORIGIN="${ORIGIN:-https://journal.camilomelo.com}"
ORIGIN="${ORIGIN%/}"

mkdir -p "$STATIC"

cat > "$STATIC/robots.txt" <<EOF
User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
EOF

python3 - "$DATA" "$ORIGIN" "$STATIC/sitemap.xml" <<'PY'
import json, sys
from pathlib import Path

data_path, origin, out_path = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3]
origin = origin.rstrip("/")

def item_slug(id_):
    s = str(id_ or "")
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return f"{h:08x}{len(s):x}"

lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    f'  <url><loc>{origin}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>',
]

if Path(data_path).is_file():
    data = json.loads(Path(data_path).read_text())
    seen = set()
    for item in data.get("items") or []:
        iid = item.get("id")
        if not iid:
            continue
        slug = item_slug(iid)
        if slug in seen:
            continue
        seen.add(slug)
        loc = f"{origin}/item/{slug}"
        lastmod = (item.get("date_modified") or item.get("date_published") or "")[:10]
        lines.append("  <url>")
        lines.append(f"    <loc>{loc}</loc>")
        if lastmod:
            lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append("    <changefreq>daily</changefreq>")
        lines.append("    <priority>0.7</priority>")
        lines.append("  </url>")

lines.append("</urlset>")
Path(out_path).write_text("\n".join(lines) + "\n")
print(f"Wrote robots.txt + sitemap.xml → {origin} ({len(seen) if Path(data_path).is_file() else 0} items)")
PY
