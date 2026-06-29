# DarkLense

**Psychology · Psychological Warfare · Information Operations** — a searchable knowledge corpus exported from [Knowledge Atlas](https://github.com/alphaonedev/knowledge-atlas).

> Paraphrased, attributed, defensive literacy. No raw transcripts.

## Live site

[https://alphaonedev.github.io/DarkLense/](https://alphaonedev.github.io/DarkLense/) (after GitHub Pages deploy)

## Corpus

| Metric | Count |
|--------|-------|
| Knowledge cards | 635 |
| Source videos | 85 |
| Topic categories | 359 |
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

```bash
# Requires Knowledge Atlas export at ../knowledge-atlas/data/export/knowledge_atlas.json
python3 scripts/export_from_atlas.py
```

Produces `data/corpus.json` and `data/nhi-analysis.json` (AI NHI pillar assessment, defense stack, top frameworks).

## Copyright posture

- **Site & packaging:** © 2026 AlphaOne LLC · Apache 2.0
- **Knowledge cards:** Paraphrased distillations with source links; no raw captions/transcripts
- **Videos:** © respective YouTube creators — watch originals for full context
- **Use:** Educational, media literacy, manipulation **defense** — not coercion

See [NOTICE](NOTICE) and [web/index.html#disclaimer](web/index.html#disclaimer).

## License

Apache License 2.0 — see [LICENSE](LICENSE).