#!/usr/bin/env bash
# Sync data/*.json → web/data/ for GitHub Pages deploy
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/web/data"
cp "$ROOT/data/"*.json "$ROOT/web/data/"
echo "Synced data/*.json → web/data/"