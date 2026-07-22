#!/usr/bin/env bash
# Copy repo data/ into app/static/data for Vite/SvelteKit static serving & Pages builds.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/app/static/data"
mkdir -p "$ROOT/app/static"
cp -a "$ROOT/data" "$ROOT/app/static/data"
touch "$ROOT/app/static/.nojekyll"
echo "Synced data/ → app/static/data"
