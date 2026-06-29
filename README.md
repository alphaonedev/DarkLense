# DarkLense

**Psychology · Psychological Warfare · Information Operations** — a searchable knowledge corpus exported from [Knowledge Atlas](https://github.com/alphaonedev/knowledge-atlas).

> Paraphrased, attributed, defensive literacy. No raw transcripts.

## Live site

[https://alphaonedev.github.io/DarkLense/](https://alphaonedev.github.io/DarkLense/) (after GitHub Pages deploy)

## Corpus

| Metric | Count |
|--------|-------|
| Knowledge cards | 645 |
| Source videos | 86 |
| Topic categories | 364 |
| Primary source | Chase Hughes (Psychology / Psy War SME) |

Cards are **LLM-paraphrased standalone knowledge** with YouTube provenance — transformative synthesis, not transcript redistribution.

## Three pillars

1. **Psychology** — identity, emotion, persuasion, frames, behavior
2. **Psychological Warfare** — psyops, propaganda, division, fear control
3. **Information Operations** — media manipulation, algorithms, narrative warfare

## Local preview

```bash
# Refresh export from Knowledge Atlas
python3 scripts/export_from_atlas.py
bash scripts/sync-data.sh

# Serve site
cd web && python3 -m http.server 8080
# http://localhost:8080
```

## Export pipeline

DarkLense uses the **official Knowledge Atlas export tools** — paraphrased cards only, never raw transcripts in the published site.

### Atlas export commands (source of truth)

```bash
cd ../knowledge-atlas && source .venv/bin/activate

# JSON — full atlas or single source
python3 atlas.py export -o /tmp/atlas.json
python3 atlas.py export --source chasehughesofficial -o /tmp/chase.json
python3 atlas.py export --rebuild -o /tmp/atlas.json    # rebuild DB first

# ZIP — full on-disk corpus (DB, transcripts, SRTs — for backup/migration only)
python3 atlas.py export-all -o /tmp/atlas-full.zip
python3 atlas.py export-all --no-raw -o /tmp/atlas-slim.zip   # skip raw SRTs
```

**HTTP** (when `atlas.py start` is running on :5179):

| Endpoint | Output |
|----------|--------|
| `GET /api/export` | Full `knowledge_atlas.json` download |
| `GET /api/export?source_id=chasehughesofficial` | Single-source subset |
| `GET /api/export/full` | Full corpus ZIP |

`build_knowledge.py` also writes `data/export/knowledge_atlas.json` on every build.

### DarkLense transform (cards → site data)

```bash
cd DarkLense
python3 scripts/export_from_atlas.py              # uses atlas.py export --source chasehughesofficial
python3 scripts/export_from_atlas.py --rebuild    # rebuild atlas first
bash scripts/sync-data.sh
```

Produces `data/corpus.json` and `data/nhi-analysis.json` (AI NHI pillar assessment, defense stack, top frameworks). **Do not** publish `export-all` ZIP contents (transcripts) to GitHub Pages — only the paraphrased card JSON.

## Copyright posture

- **Site & packaging:** © 2026 AlphaOne LLC · Apache 2.0
- **Knowledge cards:** Paraphrased distillations with source links; no raw captions/transcripts
- **Videos:** © respective YouTube creators — watch originals for full context
- **Use:** Educational, media literacy, manipulation **defense** — not coercion

See [NOTICE](NOTICE) and [web/index.html#disclaimer](web/index.html#disclaimer).

## License

Apache License 2.0 — see [LICENSE](LICENSE).