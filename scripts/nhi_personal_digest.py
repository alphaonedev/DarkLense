#!/usr/bin/env python3
"""NHI Personal Digest — concern routing + learning paths across full corpus."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS_PATH = ROOT / "data" / "corpus.json"
NHI_PATH = ROOT / "data" / "nhi-analysis.json"
WEB_NHI_PATH = ROOT / "web" / "data" / "nhi-analysis.json"

CONCERNS = [
    {
        "id": "media_feed",
        "label": "Social media & news feeds",
        "description": "Algorithms, outrage loops, manufactured consensus, identity curation online.",
        "color": "#3b82f6",
        "keywords": [
            "algorithm", "social media", "feed", "outrage", "viral", "npc", "consensus",
            "attention", "scroll", "platform", "echo", "narrative",
        ],
        "categories": [
            "media-literacy", "media-manipulation", "attention-economy",
            "psychology-of-social-media", "manufactured", "information-collapse",
        ],
        "themeIds": ["media_information"],
    },
    {
        "id": "relationships",
        "label": "Relationships & trust",
        "description": "Covert manipulation, gaslighting patterns, boundaries, and emotional exploitation.",
        "color": "#ec4899",
        "keywords": [
            "relationship", "partner", "trust", "gaslight", "boundary", "narciss",
            "exploit", "toxic", "love", "family", "friend",
        ],
        "categories": [
            "emotional-boundaries", "boundaries", "de-escalation", "manipulation",
            "narcissism", "trust",
        ],
        "themeIds": ["emotional_boundaries", "manipulation_defense"],
    },
    {
        "id": "workplace",
        "label": "Work & leadership dynamics",
        "description": "Authority, status games, persuasion in professional settings, power leaks.",
        "color": "#10b981",
        "keywords": [
            "work", "boss", "leader", "authority", "status", "office", "professional",
            "team", "manager", "career", "negotiat",
        ],
        "categories": [
            "authority", "leadership", "power-management", "persuasion", "influence",
        ],
        "themeIds": ["relationship_dynamics", "persuasion_awareness"],
    },
    {
        "id": "identity",
        "label": "Identity & autonomy",
        "description": "Who you think you are — cult pressure, conformity, self-authorship under attack.",
        "color": "#8b5cf6",
        "keywords": [
            "identity", "autonomy", "authorship", "conform", "cult", "belong", "ego",
            "values", "awakening", "self-", "obedien",
        ],
        "categories": [
            "identity", "self-authorship", "cult-recruitment", "core-identities",
            "social-identity-theory", "identity-loss",
        ],
        "themeIds": ["identity_autonomy", "manipulation_defense"],
    },
    {
        "id": "emotional_safety",
        "label": "Emotional triggers & stress",
        "description": "Shame, fear, trauma responses — what makes you compliant when pressured.",
        "color": "#f59e0b",
        "keywords": [
            "trigger", "shame", "fear", "trauma", "stress", "anxiety", "emotion",
            "insult", "guilt", "vulnerab",
        ],
        "categories": [
            "emotional-triggers", "shame", "trauma", "inherited-trauma", "de-escalation",
        ],
        "themeIds": ["emotional_boundaries"],
    },
    {
        "id": "civic_info",
        "label": "Civic & information environment",
        "description": "Psyops, propaganda, division strategies, narrative warfare at population scale.",
        "color": "#ef4444",
        "keywords": [
            "psyop", "propaganda", "division", "warfare", "population", "political",
            "narrative", "information", "radical", "extreme",
        ],
        "categories": [
            "psyop-detection", "spotting-psyops", "psyops", "propaganda",
            "psychological-warfare", "narrative-warfare", "mass-manipulation",
        ],
        "themeIds": ["manipulation_defense", "media_information"],
    },
    {
        "id": "general_defense",
        "label": "General defensive literacy",
        "description": "Balanced entry — highest universal-value cards across all themes.",
        "color": "#a855f7",
        "keywords": [],
        "categories": [],
        "themeIds": [],
        "useTierBaseline": True,
        "followUp": {
            "question": "Are you new to influence defense and want a balanced starting point?",
            "options": [
                {"id": "yes", "label": "Yes — start broad", "cardBoostIds": [19, 398, 521, 5, 505]},
                {"id": "no", "label": "No — I have specific concerns", "cardBoostIds": []},
            ],
        },
    },
]

ONBOARDING_QUESTIONS = [
    {
        "id": "feeds",
        "question": "How much do social media or news feeds shape your mood, outrage, or beliefs?",
        "options": [
            {"id": "daily", "label": "Daily — feeds noticeably steer me", "concernBoosts": {"media_feed": 12, "civic_info": 4}},
            {"id": "sometimes", "label": "Sometimes — I catch it after the fact", "concernBoosts": {"media_feed": 6}},
            {"id": "minimal", "label": "Minimal — I limit screen exposure", "concernBoosts": {"general_defense": 4}},
        ],
    },
    {
        "id": "relationships_trust",
        "question": "Are you navigating manipulation, gaslighting, or trust erosion in close relationships?",
        "options": [
            {"id": "active", "label": "Yes — actively dealing with this", "concernBoosts": {"relationships": 12, "emotional_safety": 6}},
            {"id": "watchful", "label": "Watchful — want to recognize early signs", "concernBoosts": {"relationships": 6, "emotional_safety": 3}},
            {"id": "stable", "label": "Stable — low concern right now", "concernBoosts": {}},
        ],
    },
    {
        "id": "work_power",
        "question": "Do authority, status, or persuasion dynamics at work affect your decisions or stress?",
        "options": [
            {"id": "high", "label": "High — boss, team, or politics dominate", "concernBoosts": {"workplace": 12}},
            {"id": "moderate", "label": "Moderate — occasional power games", "concernBoosts": {"workplace": 6}},
            {"id": "low", "label": "Low — not a primary stressor", "concernBoosts": {}},
        ],
    },
    {
        "id": "identity_pressure",
        "question": "Do groups, beliefs, or social pressure threaten your sense of who you are?",
        "options": [
            {"id": "yes", "label": "Yes — identity feels under pressure", "concernBoosts": {"identity": 12, "civic_info": 3}},
            {"id": "somewhat", "label": "Somewhat — exploring values and autonomy", "concernBoosts": {"identity": 6}},
            {"id": "no", "label": "No — secure in self-authorship", "concernBoosts": {}},
        ],
    },
    {
        "id": "emotional_triggers",
        "question": "When stressed, do shame, fear, or insults make you comply when you otherwise wouldn't?",
        "options": [
            {"id": "often", "label": "Often — triggers override judgment", "concernBoosts": {"emotional_safety": 12, "relationships": 4}},
            {"id": "sometimes", "label": "Sometimes — working on boundaries", "concernBoosts": {"emotional_safety": 6}},
            {"id": "rarely", "label": "Rarely — emotions don't control me", "concernBoosts": {}},
        ],
    },
    {
        "id": "civic_environment",
        "question": "How much do propaganda, division, or manufactured consensus appear in your information diet?",
        "options": [
            {"id": "constant", "label": "Constant — hard to trust any narrative", "concernBoosts": {"civic_info": 12, "media_feed": 6}},
            {"id": "occasional", "label": "Occasional — I notice psyop patterns", "concernBoosts": {"civic_info": 6}},
            {"id": "rare", "label": "Rare — not a focus", "concernBoosts": {}},
        ],
    },
]

# Per-concern follow-up (refines card ranking within digest)
_CONCERN_FOLLOW_UPS = {
    "media_feed": {
        "question": "What hits you hardest online?",
        "options": [
            {"id": "outrage", "label": "Outrage & division content", "cardBoostIds": [41, 588, 48, 42]},
            {"id": "identity", "label": "Identity curation & algorithms", "cardBoostIds": [622, 588, 421]},
            {"id": "consensus", "label": "Manufactured consensus", "cardBoostIds": [42, 41, 521]},
        ],
    },
    "relationships": {
        "question": "What's the primary relationship risk?",
        "options": [
            {"id": "gaslight", "label": "Gaslighting or covert control", "cardBoostIds": [19, 27, 505, 142]},
            {"id": "boundaries", "label": "Weak boundaries / can't say no", "cardBoostIds": [110, 9, 386]},
            {"id": "trust", "label": "Trust erosion / exploitation", "cardBoostIds": [5, 142, 173]},
        ],
    },
    "workplace": {
        "question": "What workplace dynamic concerns you most?",
        "options": [
            {"id": "authority", "label": "False authority & status games", "cardBoostIds": [71, 78, 501]},
            {"id": "compliance", "label": "Pressure to comply or perform", "cardBoostIds": [142, 54, 505]},
            {"id": "persuasion", "label": "Being persuaded against my interests", "cardBoostIds": [73, 505, 143]},
        ],
    },
    "identity": {
        "question": "Where is identity pressure coming from?",
        "options": [
            {"id": "cult", "label": "Group / cult-like belonging", "cardBoostIds": [19, 27, 3, 85]},
            {"id": "algorithm", "label": "Online identity curation", "cardBoostIds": [622, 588, 5]},
            {"id": "conformity", "label": "Social conformity & dissonance", "cardBoostIds": [5, 505, 7]},
        ],
    },
    "emotional_safety": {
        "question": "Which emotional lever hits you hardest?",
        "options": [
            {"id": "shame", "label": "Shame & concealment", "cardBoostIds": [110, 113, 173]},
            {"id": "fear", "label": "Fear & anxiety loops", "cardBoostIds": [327, 386, 173]},
            {"id": "insults", "label": "Insults & devaluation", "cardBoostIds": [110, 9, 104]},
        ],
    },
    "civic_info": {
        "question": "What civic information threat worries you?",
        "options": [
            {"id": "psyops", "label": "Psyops & propaganda patterns", "cardBoostIds": [398, 521, 48]},
            {"id": "division", "label": "Division & artificial extremes", "cardBoostIds": [41, 48, 42]},
            {"id": "narrative", "label": "Narrative warfare & consensus", "cardBoostIds": [421, 42, 327]},
        ],
    },
}

LEARNING_PATH_SPECS = [
    {
        "id": "immunity-baseline",
        "title": "5-Minute Immunity Baseline",
        "description": "Start here if overwhelmed. Five Tier-S warnings every civilian should internalize before anything else.",
        "minutes": 5,
        "concernIds": ["general_defense"],
        "seedCardIds": [19, 588, 622, 41, 142],
    },
    {
        "id": "social-media-defense",
        "title": "Social Media Defense Path",
        "description": "Algorithms, NPC traps, selective extremes — defend your attention and identity online.",
        "minutes": 15,
        "concernIds": ["media_feed"],
        "seedCardIds": [622, 588, 41, 421, 42, 48, 398],
    },
    {
        "id": "relationship-manipulation",
        "title": "Relationship Manipulation Kit",
        "description": "Boundaries, insult decoding, compliance patterns — recognize exploitation in close relationships.",
        "minutes": 20,
        "concernIds": ["relationships", "emotional_safety"],
        "seedCardIds": [110, 9, 142, 505, 5, 19, 27, 386],
    },
    {
        "id": "workplace-influence",
        "title": "Workplace Influence Defense",
        "description": "Authority, status, perceived power — navigate professional influence without leaking leverage.",
        "minutes": 15,
        "concernIds": ["workplace"],
        "seedCardIds": [71, 78, 501, 73, 54, 505, 143],
    },
    {
        "id": "psyop-pattern-map",
        "title": "Psyop Pattern Map",
        "description": "Detect information operations — FATE model, 8-step psyop framework, division strategies.",
        "minutes": 20,
        "concernIds": ["civic_info"],
        "seedCardIds": [398, 521, 48, 41, 42, 421, 327],
    },
    {
        "id": "identity-under-attack",
        "title": "Identity Under Attack",
        "description": "Cult recruitment, cognitive dissonance, awakening steps — reclaim self-authorship.",
        "minutes": 20,
        "concernIds": ["identity"],
        "seedCardIds": [5, 19, 27, 85, 3, 622, 563, 7],
    },
]


def _text(card: dict) -> str:
    return f"{card['title']} {card['content']} {card.get('reasoning') or ''}".lower()


def score_for_conern(card: dict, concern: dict, tier_map: dict[str, str]) -> float:
    if concern.get("useTierBaseline"):
        tier = tier_map.get(card["id"])
        if tier == "S":
            return 30
        if tier == "A":
            return 20
        if tier == "B":
            return 10
        return 0

    text = _text(card)
    score = 0.0
    for kw in concern.get("keywords", []):
        if kw in text:
            score += 2
    if card["category"] in concern.get("categories", []):
        score += 5
    tier = tier_map.get(card["id"])
    if tier == "S":
        score += 8
    elif tier == "A":
        score += 5
    if card["kind"] in ("warning", "framework", "mental_model"):
        score += 2
    return score


def build_tier_map(nhi: dict) -> dict[int, str]:
    tier_map: dict[int, str] = {}
    hva = nhi.get("humanValueAssessment", {})
    for tier in ("S", "A", "B"):
        for c in hva.get("tiers", {}).get(tier, {}).get("cards", []):
            tier_map[c["id"]] = tier
    return tier_map


def rank_cards_for_concern(cards: list[dict], concern: dict, tier_map: dict[int, str], limit: int = 25) -> list[int]:
    scored = [(score_for_conern(c, concern, tier_map), c["id"]) for c in cards]
    scored.sort(key=lambda x: (-x[0], x[1]))
    seen = set()
    out = []
    for s, cid in scored:
        if s <= 0 and not concern.get("useTierBaseline"):
            break
        if cid in seen:
            continue
        seen.add(cid)
        out.append(cid)
        if len(out) >= limit:
            break
    return out


def build_path_steps(cards_by_id: dict[int, dict], path_spec: dict, concern_ranks: dict[str, list[int]]) -> list[dict]:
    steps = []
    used = set()
    order = 0

    for cid in path_spec.get("seedCardIds", []):
        if cid in used or cid not in cards_by_id:
            continue
        c = cards_by_id[cid]
        order += 1
        used.add(cid)
        steps.append({
            "order": order,
            "cardId": cid,
            "title": c["title"],
            "kind": c["kind"],
            "why": _step_why(c, path_spec["id"]),
        })

    for concern_id in path_spec.get("concernIds", []):
        for cid in concern_ranks.get(concern_id, []):
            if cid in used or cid not in cards_by_id:
                continue
            c = cards_by_id[cid]
            order += 1
            used.add(cid)
            steps.append({
                "order": order,
                "cardId": cid,
                "title": c["title"],
                "kind": c["kind"],
                "why": _step_why(c, path_spec["id"]),
            })
            if len(steps) >= 12:
                break
        if len(steps) >= 12:
            break

    return steps[:12]


def _step_why(card: dict, path_id: str) -> str:
    kind = card["kind"]
    if path_id == "immunity-baseline":
        return "Baseline immunity — assume you are already a target."
    if kind == "warning":
        return "Warning signal — high salience before deeper frameworks."
    if kind == "framework":
        return "Apply as recognition checklist, not coercion playbook."
    if kind == "mental_model":
        return "Reframes what you notice before you react."
    return "Core defensive literacy for this path."


def build_personal_digest(cards: list[dict], nhi: dict) -> dict:
    tier_map = build_tier_map(nhi)
    cards_by_id = {c["id"]: c for c in cards}

    concern_ranks: dict[str, list[int]] = {}
    concerns_out = []
    for concern in CONCERNS:
        top_ids = rank_cards_for_concern(cards, concern, tier_map)
        concern_ranks[concern["id"]] = top_ids
        entry = {
            "id": concern["id"],
            "label": concern["label"],
            "description": concern["description"],
            "color": concern["color"],
            "topCardIds": top_ids[:20],
            "cardCount": len(top_ids),
        }
        follow = concern.get("followUp") or _CONCERN_FOLLOW_UPS.get(concern["id"])
        if follow:
            entry["followUp"] = follow
        concerns_out.append(entry)

    paths_out = []
    for spec in LEARNING_PATH_SPECS:
        steps = build_path_steps(cards_by_id, spec, concern_ranks)
        paths_out.append({
            "id": spec["id"],
            "title": spec["title"],
            "description": spec["description"],
            "minutes": spec["minutes"],
            "concernIds": spec["concernIds"],
            "stepCount": len(steps),
            "cardIds": [s["cardId"] for s in steps],
            "steps": steps,
        })

    return {
        "title": "AI NHI — Personal Digest Methodology",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "principle": (
            "645 cards is a reference library, not a reading list. "
            "NHI routes each person through concern-based filtering → a 12–25 card personal digest → "
            "optional learning paths → full corpus on demand."
        ),
        "layers": [
            {
                "order": 1,
                "name": "Concern routing",
                "description": "Individual selects what matters now — feeds, relationships, work, identity, civic literacy.",
            },
            {
                "order": 2,
                "name": "Personal digest",
                "description": "NHI merges concern-ranked cards with Tier S baseline — typically 12–25 cards, not 645.",
            },
            {
                "order": 3,
                "name": "Learning paths",
                "description": "Curated 5–20 minute sequences with ordered steps and one-line rationale per card.",
            },
            {
                "order": 4,
                "name": "Full corpus",
                "description": "Search, filter, compact list — entire library when you need depth or research.",
            },
        ],
        "methodologyDistill": {
            "lead": "Smarter corpus access: relevance first, volume never.",
            "rulesTitle": "NHI presentation rules",
            "rules": [
                "Never default to 645 — default to personalized digest",
                "Tier S baseline always included — immunity warnings are universal",
                "Max 3 concerns merged — prevents dilution",
                "Learning paths are ordered sequences, not tag soup",
                "Full corpus remains one click away for researchers",
            ],
            "antiPatternsTitle": "What we stopped doing",
            "antiPatterns": [
                "Flat grid of 645 cards as the primary experience",
                "Video-first navigation — cards are the knowledge",
                "One-size Tier list without individual concern routing",
                "Hiding 525+ cards behind arbitrary display caps",
            ],
        },
        "onboarding": {
            "title": "NHI Concern Onboarding",
            "description": "Six questions route you to the right concerns — not all 645 cards.",
            "questions": ONBOARDING_QUESTIONS,
        },
        "concerns": concerns_out,
        "learningPaths": paths_out,
        "defaultConcernId": "general_defense",
        "digestSize": {"min": 12, "max": 25, "baselineTierSCards": 3, "dailyCount": 3},
    }


def merge_digest(nhi: dict, digest: dict) -> dict:
    nhi = dict(nhi)
    nhi["personalDigest"] = digest
    return nhi


def main() -> None:
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    nhi = json.loads(NHI_PATH.read_text(encoding="utf-8"))
    digest = build_personal_digest(corpus["cards"], nhi)
    nhi = merge_digest(nhi, digest)

    for path in (NHI_PATH, WEB_NHI_PATH):
        path.write_text(json.dumps(nhi, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Personal digest: {len(digest['concerns'])} concerns, {len(digest['learningPaths'])} paths")


if __name__ == "__main__":
    main()