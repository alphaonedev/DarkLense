#!/usr/bin/env python3
"""AI NHI universal human-value assessment — scores all corpus cards."""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS_PATH = ROOT / "data" / "corpus.json"
NHI_PATH = ROOT / "data" / "nhi-analysis.json"
WEB_NHI_PATH = ROOT / "web" / "data" / "nhi-analysis.json"

THEMES = {
    "manipulation_defense": {
        "label": "Recognize & Resist Manipulation",
        "why": "Covert influence appears in relationships, workplaces, politics, and media — detection is universal self-defense.",
        "color": "#ef4444",
        "keywords": [
            "manipul", "coerc", "cult", "compliance", "gaslight", "psyop", "propaganda",
            "deception", "covert", "exploit", "predat", "weaponiz", "brainwash",
        ],
        "categories": [
            "psyop-detection", "cult-recruitment", "manipulation", "mass-manipulation",
            "spotting-psyops", "psychological-defense", "influence-formula", "frame-control",
            "psychological-warfare", "mind-control",
        ],
    },
    "identity_autonomy": {
        "label": "Identity, Autonomy & Self-Authorship",
        "why": "Identity is the control surface — lose authorship of your story and you accept frames others set for you.",
        "color": "#8b5cf6",
        "keywords": [
            "identity", "autonomy", "authorship", "self-", "ego", "conform", "obedien",
            "agency", "authentic", "values", "belief", "awakening",
        ],
        "categories": [
            "identity", "self-authorship", "core-identities", "social-identity-theory",
            "identity-loss", "personal-growth", "ego-dissolution",
        ],
    },
    "emotional_boundaries": {
        "label": "Emotional Triggers & Boundaries",
        "why": "Unmanaged triggers and absent boundaries make anyone exploitable when stressed or shamed.",
        "color": "#f59e0b",
        "keywords": [
            "trigger", "boundar", "emotion", "shame", "fear", "trauma", "de-escalat",
            "stress", "anxiety", "guilt", "vulnerab", "insult",
        ],
        "categories": [
            "emotional-triggers", "emotional-boundaries", "de-escalation", "boundaries",
            "trauma", "shame", "inherited-trauma",
        ],
    },
    "media_information": {
        "label": "Media & Information Literacy",
        "why": "Algorithms, outrage loops, and manufactured consensus target every person with a screen.",
        "color": "#3b82f6",
        "keywords": [
            "media", "algorithm", "social media", "information", "narrative", "consensus",
            "attention", "viral", "outrage", "echo", "bot", "feed", "npc",
        ],
        "categories": [
            "media-literacy", "media-manipulation", "information-collapse",
            "attention-economy", "psychology-of-social-media", "manufactured",
            "narrative-warfare",
        ],
    },
    "persuasion_awareness": {
        "label": "How Influence Works",
        "why": "Understanding persuasion mechanics is defensive literacy — the vaccine, not the weapon.",
        "color": "#a855f7",
        "keywords": [
            "persuas", "influence", "frame", "authority", "reciproc", "scarcity",
            "social proof", "cognitive dissonance", "compliance", "rapport", "permission",
        ],
        "categories": [
            "influence", "persuasion", "frame-control", "authority", "influence-formula",
            "ethical-persuasion", "influence-sequence",
        ],
    },
    "relationship_dynamics": {
        "label": "Relationships & Social Power",
        "why": "Status, rapport, and power leaks shape family, work, and community — everyone navigates these daily.",
        "color": "#10b981",
        "keywords": [
            "rapport", "trust", "status", "power", "leader", "narciss", "empathy",
            "relationship", "social", "group", "tribal", "belong", "authority",
        ],
        "categories": [
            "body-language", "nonverbal", "authority", "leadership", "narcissism",
            "empathy", "power-management",
        ],
    },
    "critical_warnings": {
        "label": "Universal Warning Signals",
        "why": "High-signal warnings about patterns that destroy autonomy, trust, and judgment at scale.",
        "color": "#dc2626",
        "keywords": [],
        "categories": [],
        "kinds": ["warning"],
    },
    "actionable_frameworks": {
        "label": "Actionable Frameworks",
        "why": "Multi-step models civilians can apply without elite training or classified context.",
        "color": "#22c55e",
        "keywords": [],
        "categories": [],
        "kinds": ["framework"],
    },
}

KIND_WEIGHT = {
    "warning": 4,
    "framework": 3,
    "mental_model": 3,
    "principle": 2,
    "tactic": 1,
    "quote": 0.5,
    "phrase": 0.5,
}
PILLAR_WEIGHT = {
    "psychological_warfare": 2,
    "information_operations": 2,
    "psychology": 1,
}

UNIVERSAL_TERMS = [
    "everyone", "every person", "all people", "human", "civilian", "daily", "relationship",
    "family", "work", "life", "health", "freedom", "autonomy", "safety", "trust", "fear",
    "identity", "emotion", "media", "internet", "phone", "social", "manipulation",
]

# Manual boosts — cards NHI flags as disproportionately important for all humans
MANUAL_BOOST = {
    19: 6,   # Immunity Illusion
    27: 5,   # Preemptive Invalidation
    41: 5,   # Selective Extremes (psyops)
    42: 6,   # Manufactured Artificial Consensus
    48: 5,   # Unrestricted Warfare Division
    5: 5,    # Identity Creates Cognitive Dissonance
    22: 4,   # Seen and Unjudged
    521: 6,  # 8-Step Detect Psyops
    398: 6,  # FATE Model
    505: 5,  # 6-Step Cognitive Dissonance
    622: 6,  # Algorithms Curate Identity
    588: 5,  # NPC Conversion Trap
    78: 4,   # Rank Is Not Leadership
    142: 4,  # Compliance Teaches Hiding
    113: 4,  # High Cost of Concealment
}

NICHE_PENALTY_TERMS = [
    "elite operator", "cia", "interrogation room", "pickup artist", "sales quota",
]


def _text(card: dict) -> str:
    return f"{card['title']} {card['content']} {card.get('reasoning') or ''}".lower()


def score_card(card: dict) -> tuple[float, str, dict[str, int]]:
    text = _text(card)
    theme_hits: dict[str, int] = {}

    for tid, theme in THEMES.items():
        s = 0
        for kw in theme.get("keywords", []):
            if kw in text:
                s += 2
        if card["category"] in theme.get("categories", []):
            s += 4
        if card["kind"] in theme.get("kinds", []):
            s += 3
        if s:
            theme_hits[tid] = s

    base = KIND_WEIGHT.get(card["kind"], 1) * 2
    base += PILLAR_WEIGHT.get(card["pillar"], 1)
    if card.get("framework_steps"):
        base += min(len(card["framework_steps"]), 5)
    if card.get("reasoning"):
        base += 1
    base += min(sum(1 for u in UNIVERSAL_TERMS if u in text), 5)
    base += MANUAL_BOOST.get(card["id"], 0)

    if sum(1 for n in NICHE_PENALTY_TERMS if n in text) >= 1:
        base -= 3

    primary = max(theme_hits, key=theme_hits.get) if theme_hits else "persuasion_awareness"
    total = base + (max(theme_hits.values()) if theme_hits else 0)
    return total, primary, theme_hits


def nhi_verdict(card: dict, theme_id: str) -> str:
    theme = THEMES[theme_id]["label"]
    kind = card["kind"]
    snippet = card["content"][:120].rstrip()
    if snippet and snippet[-1] not in ".!?":
        snippet = snippet.rsplit(" ", 1)[0] + "…"
    templates = {
        "warning": f"Universal warning under {theme}: {snippet}",
        "framework": f"Actionable framework — {theme}. Apply defensively, not coercively.",
        "mental_model": f"Foundational mental model for {theme.lower()}. Changes what you notice before you react.",
        "principle": f"Core principle for {theme.lower()} — relevant across relationships, media, and self-governance.",
    }
    return templates.get(kind, f"High-value {kind} for {theme.lower()}.")


def assess_corpus(cards: list[dict]) -> dict:
    scored = []
    theme_card_ids: dict[str, list[tuple[float, int]]] = defaultdict(list)

    for card in cards:
        total, primary, hits = score_card(card)
        scored.append({
            "card": card,
            "score": total,
            "primaryTheme": primary,
            "themeHits": hits,
        })
        for tid, hs in hits.items():
            theme_card_ids[tid].append((total + hs, card["id"]))

    scored.sort(key=lambda x: (-x["score"], x["card"]["id"]))

    tier_s = scored[:15]
    tier_a = scored[15:35]
    tier_b = scored[35:60]

    def pack_tier(rows: list, tier: str) -> list[dict]:
        out = []
        for row in rows:
            c = row["card"]
            out.append({
                "id": c["id"],
                "title": c["title"],
                "kind": c["kind"],
                "category": c["category"],
                "pillar": c["pillar"],
                "theme": THEMES[row["primaryTheme"]]["label"],
                "themeId": row["primaryTheme"],
                "score": round(row["score"], 1),
                "tier": tier,
                "nhiVerdict": nhi_verdict(c, row["primaryTheme"]),
                "contentPreview": c["content"][:180] + ("…" if len(c["content"]) > 180 else ""),
            })
        return out

    themes_out = []
    for tid, meta in THEMES.items():
        ranked_ids = sorted(theme_card_ids.get(tid, []), key=lambda x: -x[0])
        top_ids = [i for _, i in ranked_ids[:8]]
        themes_out.append({
            "id": tid,
            "label": meta["label"],
            "why": meta["why"],
            "color": meta["color"],
            "cardCount": len(ranked_ids),
            "topCardIds": top_ids,
            "filterCategories": meta.get("categories", []),
        })
    themes_out.sort(key=lambda x: -x["cardCount"])

    tier_s_cards = pack_tier(tier_s, "S")
    tier_a_cards = pack_tier(tier_a, "A")
    tier_b_cards = pack_tier(tier_b, "B")
    top_card_ids = [c["id"] for c in tier_s_cards + tier_a_cards]

    # Executive distill from actual top themes
    theme_counts = Counter(row["primaryTheme"] for row in scored[:60])
    top_theme_labels = [THEMES[t]["label"] for t, _ in theme_counts.most_common(4)]

    return {
        "title": "AI NHI — Universal Human Value Assessment",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "cardsAssessed": len(cards),
        "methodology": (
            f"Full-corpus NHI scan of all {len(cards)} knowledge cards. "
            "Each card scored on manipulation defense, identity/autonomy, emotional boundaries, "
            "media literacy, persuasion awareness, relationship dynamics, warning salience, "
            "and framework actionability. Tier S = essential for every civilian; Tier A = high universal value; "
            "Tier B = strong situational value. Manual NHI boosts applied to cult-warning, psyop-detection, "
            "and algorithmic-identity cards."
        ),
        "executiveSummaryDistill": {
            "lead": (
                f"NHI assessed all {len(cards)} cards for universal human importance — "
                "not operator utility, not sport persuasion, not niche elite tradecraft."
            ),
            "findingsTitle": "NHI findings",
            "findings": [
                f"{len([c for c in cards if c['kind'] == 'warning'])} warning cards — highest salience for civilians who assume they are immune",
                f"{len([c for c in cards if c['kind'] == 'framework'])} frameworks — {len(tier_s_cards)} Tier-S models are actionable without classified context",
                "Manipulation defense and identity/autonomy dominate the top 60 — not tactical pickup or sales scripts",
                "Media literacy and algorithmic identity cards rank essential in the digital-attention economy",
                "Defensive literacy stack holds: detect psyops → decode frames/triggers → defend boundaries → discipline attention",
            ],
            "tierSTitle": "Tier S — essential for every human (15 cards)",
            "tierS": [f"{c['title']} — {c['theme']}" for c in tier_s_cards],
            "imperativeTitle": "NHI imperative",
            "imperative": [
                "Assume you are already being influenced — immunity is the primary vulnerability",
                "Identity is the attack surface; protect self-authorship before debating facts",
                "Triggers precede compliance — decode emotion before accepting frames",
                "Algorithms curate identity; outrage is engagement fuel, not truth signal",
                "Use frameworks for recognition and exit — never for coercion",
            ],
        },
        "themes": themes_out,
        "tiers": {
            "S": {
                "label": "Tier S — Essential",
                "description": "Every civilian benefits — manipulation defense, identity, media literacy, core warnings.",
                "cards": tier_s_cards,
            },
            "A": {
                "label": "Tier A — High Value",
                "description": "Broad human relevance — relationships, persuasion mechanics, emotional boundaries.",
                "cards": tier_a_cards,
            },
            "B": {
                "label": "Tier B — Situational",
                "description": "Strong value when context matches — still paraphrased and attributed.",
                "cards": tier_b_cards,
            },
        },
        "topCardIds": top_card_ids,
        "topThemes": top_theme_labels,
        "stats": {
            "tierS": len(tier_s_cards),
            "tierA": len(tier_a_cards),
            "tierB": len(tier_b_cards),
            "themes": len(themes_out),
        },
    }


def merge_into_nhi(nhi: dict, assessment: dict) -> dict:
    nhi = dict(nhi)
    nhi["humanValueAssessment"] = assessment
    # Replace lightweight highValueCards with Tier S+A enriched entries
    nhi["highValueCards"] = [
        {
            "id": c["id"],
            "title": c["title"],
            "kind": c["kind"],
            "category": c["category"],
            "pillar": c["pillar"],
            "tier": c["tier"],
            "theme": c["theme"],
            "nhiVerdict": c["nhiVerdict"],
        }
        for c in assessment["tiers"]["S"]["cards"] + assessment["tiers"]["A"]["cards"]
    ]
    # Enrich executive summary
    nhi["executiveSummary"] = (
        f"DarkLense indexes {nhi['stats']['cards']} LLM-paraphrased knowledge cards from "
        f"{nhi['stats']['videos']} videos. AI NHI assessed all {assessment['cardsAssessed']} cards for "
        f"universal human value: {assessment['stats']['tierS']} Tier-S essentials, "
        f"{assessment['stats']['tierA']} Tier-A high-value picks across "
        f"{', '.join(assessment['topThemes'][:3])}, and related themes. "
        "Cards are standalone defensive literacy — not raw transcripts. "
        "Use for recognition, boundaries, media literacy, and ethical self-governance — not coercion."
    )
    return nhi


def main() -> None:
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    cards = corpus["cards"]
    assessment = assess_corpus(cards)

    nhi = json.loads(NHI_PATH.read_text(encoding="utf-8"))
    nhi = merge_into_nhi(nhi, assessment)

    try:
        from nhi_personal_digest import build_personal_digest, merge_digest

        nhi = merge_digest(nhi, build_personal_digest(cards, nhi))
    except ImportError:
        pass

    for path in (NHI_PATH, WEB_NHI_PATH):
        path.write_text(json.dumps(nhi, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"NHI assessed {len(cards)} cards")
    print(f"  Tier S: {assessment['stats']['tierS']}")
    print(f"  Tier A: {assessment['stats']['tierA']}")
    print(f"  Tier B: {assessment['stats']['tierB']}")
    print(f"  Top themes: {', '.join(assessment['topThemes'])}")


if __name__ == "__main__":
    main()