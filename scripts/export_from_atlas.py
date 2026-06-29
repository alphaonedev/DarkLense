#!/usr/bin/env python3
"""Export Knowledge Atlas paraphrased cards into DarkLense corpus (no raw transcripts)."""

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ATLAS_EXPORT = Path(__file__).resolve().parents[2] / "knowledge-atlas" / "data" / "export" / "knowledge_atlas.json"
OUT_DIR = Path(__file__).resolve().parents[1] / "data"
WEB_DIR = Path(__file__).resolve().parents[1] / "web" / "data"

PILLAR_RULES = {
    "psychological_warfare": [
        "psyop", "psychological-warfare", "psychological-operations", "psychological-defense",
        "propaganda", "mind-control", "mass-manipulation", "narrative-warfare", "psyop-detection",
        "unrestricted", "cognitive-virology", "fear-control", "elite-control", "radicalization",
        "political-violence", "theater-of-power", "human-conditioning",
    ],
    "information_operations": [
        "information", "media-manipulation", "media-literacy", "media-control", "algorithmic",
        "social-media", "attention-economy", "narrative", "influence-cascade", "manufactured",
        "bot", "consensus", "information-collapse", "information-environment", "branding",
        "mediated-reality", "simulacra", "hyperreality",
    ],
    "psychology": [
        "emotion", "cognitive", "behavior", "neuro", "brain", "identity", "personality",
        "trauma", "narciss", "ego", "persuasion", "influence", "frame", "body-language",
        "nonverbal", "hypnot", "linguistic", "authority", "manipulation", "de-escalation",
        "empathy", "confidence", "self-", "habit", "dopamine", "trigger", "boundaries",
    ],
}

HIGH_VALUE_CATEGORIES = [
    "influence", "frame-control", "psyop-detection", "persuasion", "body-language",
    "emotional-triggers", "influence-formula", "psychological-warfare", "psychological-operations",
    "media-manipulation", "narrative-warfare", "behavioral-profiling", "cult-recruitment",
    "linguistic-weapons", "authority", "de-escalation", "ethical-persuasion", "psychological-defense",
]


def assign_pillar(card: dict) -> str:
    text = " ".join([
        card.get("category", ""),
        card.get("title", ""),
        card.get("content", ""),
    ]).lower()
    scores = {}
    for pillar, keys in PILLAR_RULES.items():
        scores[pillar] = sum(1 for k in keys if k in text)
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "psychology"
    # tie-break toward psywar > info_ops > psychology
    top = max(scores.values())
    tied = [p for p, s in scores.items() if s == top]
    for pref in ("psychological_warfare", "information_operations", "psychology"):
        if pref in tied:
            return pref
    return best


def flatten_cards(export: dict) -> list[dict]:
    cards = []
    seen = set()
    for _cat, items in export.get("cards_by_category", {}).items():
        for c in items:
            if c["id"] in seen:
                continue
            seen.add(c["id"])
            if c.get("source_id") == "example-expert":
                continue
            card = {
                "id": c["id"],
                "kind": c["kind"],
                "category": c["category"],
                "title": c["title"],
                "content": c["content"],
                "reasoning": c.get("reasoning"),
                "source_quote": c.get("source_quote"),
                "framework_steps": c.get("framework_steps") or [],
                "video_id": c["video_id"],
                "video_title": c["video_title"],
                "video_url": c["video_url"],
                "source_id": c["source_id"],
                "pillar": assign_pillar(c),
            }
            cards.append(card)
    return sorted(cards, key=lambda x: x["id"])


def build_nhi_analysis(cards: list, videos: list, source: dict) -> dict:
    pillar_counts = Counter(c["pillar"] for c in cards)
    kind_counts = Counter(c["kind"] for c in cards)
    cat_counts = Counter(c["category"] for c in cards)

    top_categories = [
        {"category": cat, "count": n, "pillar": assign_pillar({"category": cat, "title": "", "content": ""})}
        for cat, n in cat_counts.most_common(30)
    ]

    frameworks = [c for c in cards if c["kind"] == "framework" and c.get("framework_steps")]
    warnings = [c for c in cards if c["kind"] == "warning"]
    tactics = [c for c in cards if c["kind"] == "tactic"]

    def score_card(c):
        s = 0
        if c["category"] in HIGH_VALUE_CATEGORIES:
            s += 3
        if c["kind"] in ("framework", "mental_model", "warning"):
            s += 2
        if c["pillar"] in ("psychological_warfare", "information_operations"):
            s += 2
        if c.get("framework_steps"):
            s += 1
        return s

    ranked = sorted(cards, key=score_card, reverse=True)[:40]

    return {
        "title": "DarkLense AI NHI Corpus Assessment",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "executiveSummary": (
            f"DarkLense indexes {len(cards)} LLM-paraphrased knowledge cards from "
            f"{len(videos)} videos by {source.get('name', 'indexed expert')} on psychology, "
            "psychological warfare, and information operations. Cards are standalone, transformative "
            "synthesis — not raw transcripts. Highest-density clusters: influence ({inf}c), "
            "frame-control ({fc}c), psyop-detection ({pd}c), and persuasion ({ps}c). "
            "Use for defense: recognition, de-escalation, media literacy, and ethical influence — "
            "not coercion."
        ).format(
            inf=cat_counts.get("influence", 0),
            fc=cat_counts.get("frame-control", 0),
            pd=cat_counts.get("psyop-detection", 0),
            ps=cat_counts.get("persuasion", 0),
        ),
        "pillars": [
            {
                "id": "psychology",
                "name": "Psychology",
                "description": "Identity, emotion, behavior, neuroscience, persuasion mechanics, frames, and interpersonal influence at the individual level.",
                "cardCount": pillar_counts.get("psychology", 0),
                "color": "#8b5cf6",
            },
            {
                "id": "psychological_warfare",
                "name": "Psychological Warfare",
                "description": "Psyops, propaganda, division strategies, cognitive virology, fear control, and population-level behavioral manipulation.",
                "cardCount": pillar_counts.get("psychological_warfare", 0),
                "color": "#ef4444",
            },
            {
                "id": "information_operations",
                "name": "Information Operations",
                "description": "Media manipulation, algorithmic influence, narrative warfare, manufactured consensus, and information-environment defense.",
                "cardCount": pillar_counts.get("information_operations", 0),
                "color": "#3b82f6",
            },
        ],
        "kindDistribution": dict(kind_counts),
        "topCategories": top_categories,
        "defenseStack": [
            {"priority": 1, "layer": "Detect", "focus": "Psyop-detection, pattern recognition, media-literacy cards", "cards": cat_counts.get("psyop-detection", 0) + cat_counts.get("media-literacy", 0)},
            {"priority": 2, "layer": "Decode", "focus": "Frame-control, influence-formula, emotional-triggers", "cards": cat_counts.get("frame-control", 0) + cat_counts.get("influence-formula", 0) + cat_counts.get("emotional-triggers", 0)},
            {"priority": 3, "layer": "Defend", "focus": "Boundaries, de-escalation, psychological-defense, ethical-persuasion", "cards": cat_counts.get("boundaries", 0) + cat_counts.get("de-escalation", 0) + cat_counts.get("psychological-defense", 0)},
            {"priority": 4, "layer": "Discipline", "focus": "Outcome-based tech use, self-authorship, identity repair", "cards": cat_counts.get("self-authorship", 0) + cat_counts.get("phone-addiction", 0)},
        ],
        "topFrameworks": [
            {"title": c["title"], "category": c["category"], "pillar": c["pillar"], "steps": len(c.get("framework_steps", []))}
            for c in sorted(frameworks, key=lambda x: len(x.get("framework_steps", [])), reverse=True)[:15]
        ],
        "criticalWarnings": [
            {"title": c["title"], "content": c["content"][:200], "category": c["category"]}
            for c in warnings[:12]
        ],
        "highValueCards": [
            {"id": c["id"], "title": c["title"], "kind": c["kind"], "category": c["category"], "pillar": c["pillar"]}
            for c in ranked[:25]
        ],
        "stats": {
            "videos": len(videos),
            "cards": len(cards),
            "categories": len(cat_counts),
            "tactics": kind_counts.get("tactic", 0),
            "frameworks": kind_counts.get("framework", 0),
            "warnings": kind_counts.get("warning", 0),
        },
        "ethicalUse": {
            "permitted": ["Education", "Self-defense against manipulation", "Media literacy training", "Research with attribution"],
            "prohibited": ["Coercive control", "Fraud", "Unauthorized surveillance", "Election interference", "Harassment"],
            "note": "DarkLense is defensive literacy — understanding influence to resist it, not to weaponize it.",
        },
    }


def main():
    if not ATLAS_EXPORT.exists():
        raise SystemExit(f"Atlas export not found: {ATLAS_EXPORT}")

    export = json.loads(ATLAS_EXPORT.read_text())
    cards = flatten_cards(export)
    videos = [v for v in export.get("videos", []) if v.get("source_id") != "example-expert"]
    source = next(
        (s for s in export.get("sources", []) if s.get("id") == "chasehughesofficial"),
        export.get("sources", [{}])[0],
    )

    corpus = {
        "meta": {
            "name": "DarkLense",
            "version": "1.0.0",
            "exported_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "Knowledge Atlas (paraphrased cards only)",
            "copyright": "Copyright 2026 AlphaOne LLC. Corpus synthesis licensed Apache-2.0.",
            "attribution": f"Knowledge cards are LLM-paraphrased standalone distillations. Original video content © respective creators. Source: {source.get('name')} — {source.get('url')}",
            "noTranscripts": True,
            "transformativeUse": "Cards are paraphrased, categorized, and attributed — not substitutes for original videos.",
        },
        "source": {
            "id": source.get("id"),
            "name": source.get("name"),
            "url": source.get("url"),
            "domain": source.get("domain"),
            "expertise": source.get("expertise"),
            "videoCount": len(videos),
        },
        "totals": {
            "cards": len(cards),
            "videos": len(videos),
            "categories": len({c["category"] for c in cards}),
        },
        "cards": cards,
        "videos": [
            {
                "video_id": v["video_id"],
                "video_title": v["video_title"],
                "video_url": v["video_url"],
                "one_line": v.get("one_line", ""),
                "categories": v.get("categories", []),
                "card_count": v.get("card_count", 0),
            }
            for v in videos
        ],
    }

    nhi = build_nhi_analysis(cards, videos, source)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "corpus.json").write_text(json.dumps(corpus, indent=2, ensure_ascii=False))
    (OUT_DIR / "nhi-analysis.json").write_text(json.dumps(nhi, indent=2, ensure_ascii=False))
    (WEB_DIR / "corpus.json").write_text(json.dumps(corpus, indent=2, ensure_ascii=False))
    (WEB_DIR / "nhi-analysis.json").write_text(json.dumps(nhi, indent=2, ensure_ascii=False))
    print(f"Exported {len(cards)} cards, {len(videos)} videos → {OUT_DIR}")


if __name__ == "__main__":
    main()