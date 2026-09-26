"""
Claims Verification Gate — the evidence gate that decides whether campaign copy
is safe to publish.

Design (per PDM review): the DETERMINISTIC classifier is the single source of
truth. An optional LLM pass only *enriches the phrasing* of Otto's interventions
when a real provider is configured; it can never change a claim's status, a
founder override, or the gate decision. This keeps the gate fully reliable
offline (simulated mode), which is the primary demo target.

Statuses:      VERIFIED | NEEDS_EVIDENCE | PROHIBITED
Gate actions:  allow    | flag           | block
Decisions:     ALLOWED_BY_EVIDENCE | ALLOWED_BY_FOUNDER_OVERRIDE | NEEDS_OVERRIDE | BLOCKED

Invariant (Amendment #2): a founder override can move a NEEDS_EVIDENCE claim to
ALLOWED_BY_FOUNDER_OVERRIDE, but can NEVER clear a PROHIBITED claim — a prohibited
claim always stays BLOCKED and keeps the whole gate blocked.
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional

from app.config import settings
from app.providers.base import BaseProvider
from app.providers.provider_factory import get_provider

logger = logging.getLogger("claims_gate")

# --- Deterministic vocabulary -------------------------------------------------

# Unqualified superlatives / absolutes. Matched on normalized text with word
# boundaries so "fastest" fires on "industry's fastest platform" but never inside
# an unrelated word.
_SUPERLATIVE_WORDS = [
    "fastest", "best", "cheapest", "greatest", "smartest", "strongest",
    "guaranteed", "unbeatable", "unmatched", "flawless",
]
_ABSOLUTE_PATTERNS = [
    r"#\s*1\b",
    r"\bnumber\s+one\b",
    r"\bworld'?s\b",
    r"\bindustry[-\s]?leading\b",
    r"\bno\s+other\b",
    r"\bonly\s+platform\b",
    r"\b100%\s+(?:guaranteed|secure|reliable|accurate)\b",
]

# Quantitative / outcome markers that require evidence when not already verified.
_QUANT_PATTERNS = [
    r"\d+\s*%",
    r"\d+\s*x\b",
    r"\bhundreds of\b",
    r"\bthousands of\b",
    r"\bmillions? of\b",
    r"\bsave[sd]?\b[^.]*\bhours?\b",
    r"\d+\s+hours?\b",
    r"\d+\s+days?\b",
    r"\d+\s+minutes?\b",
]

_PROHIBITED_RX = re.compile(
    "|".join([r"\b(?:" + "|".join(_SUPERLATIVE_WORDS) + r")\b"] + _ABSOLUTE_PATTERNS),
    re.IGNORECASE,
)
_QUANT_RX = re.compile("|".join(_QUANT_PATTERNS), re.IGNORECASE)
# Numeric signatures used to recognise a verified claim inside free text.
_NUMERIC_SIG_RX = re.compile(
    r"\d+\s*%|\d+\s*x\b|\d+\s+(?:hours?|days?|minutes?|seconds?)", re.IGNORECASE
)


def _normalize(text: str) -> str:
    """Lowercase, fold smart apostrophes, and collapse whitespace for matching."""
    t = (text or "").lower()
    t = t.replace("’", "'").replace("‘", "'").replace("`", "'")
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def _split_spans(text: str) -> List[str]:
    """Split channel copy into candidate claim spans (sentences / bullet lines)."""
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+|\n+|[•]\s*", text)
    spans: List[str] = []
    for p in parts:
        s = p.strip(" \t\r\n-–•*").strip()
        if len(s) > 6:
            spans.append(s)
    return spans


def _extract_channel_texts(channels: Any) -> Dict[str, str]:
    """
    Accepts either the simple Studio ``posts`` shape ({linkedin: "text", ...}) or the
    full campaign ``channels`` shape ({linkedin: {post_text, cta}, video: {scenes}, ...})
    and returns a flat {channel: combined_copy} map.
    """
    out: Dict[str, str] = {}
    if not isinstance(channels, dict):
        return out
    for name, val in channels.items():
        if isinstance(val, str):
            out[name] = val
        elif isinstance(val, dict):
            parts = [
                val.get("post_text"), val.get("caption"), val.get("visual_headline"),
                val.get("hook_line"), val.get("title"), val.get("cta"),
            ]
            for scene in val.get("scenes", []) or []:
                if isinstance(scene, dict):
                    parts.append(scene.get("voiceover"))
                    parts.append(scene.get("visual"))
            out[name] = "\n".join([p for p in parts if p])
    return out


def _verified_index(known_claims: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Build searchable signatures for every VERIFIED known claim."""
    idx: List[Dict[str, str]] = []
    for c in known_claims or []:
        if str(c.get("status", "")).strip().lower() not in ("verified", "approved"):
            continue
        text = _normalize(c.get("text") or c.get("claim") or "")
        if not text:
            continue
        source = c.get("source") or c.get("evidence") or "Brand Memory (verified)"
        numeric = _NUMERIC_SIG_RX.findall(text)
        if numeric:
            for sig in numeric:
                idx.append({"sig": sig.strip(), "source": source, "text": text})
        else:
            idx.append({"sig": text, "source": source, "text": text})
    return idx


def _prohibited_phrases(known_claims: List[Dict[str, Any]]) -> List[str]:
    """Phrases the brand has explicitly marked prohibited in Brand Memory."""
    out = []
    for c in known_claims or []:
        if str(c.get("status", "")).strip().lower() in ("prohibited", "banned", "blocked"):
            t = _normalize(c.get("text") or c.get("claim") or "")
            if t:
                out.append(t)
    return out


class ClaimsGate:
    """Evidence gate: classifies campaign claims and produces Otto interventions."""

    def __init__(self, provider: BaseProvider = None):
        self._provider = provider

    @property
    def provider(self) -> BaseProvider:
        if not self._provider:
            self._provider = get_provider()
        return self._provider

    async def verify(
        self,
        channel_texts: Any,
        brand_memory: Optional[Dict[str, Any]] = None,
        known_claims: Optional[List[Dict[str, Any]]] = None,
        founder_overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        known_claims = known_claims or []
        founder_overrides = founder_overrides or {}
        texts = _extract_channel_texts(channel_texts)

        verified_idx = _verified_index(known_claims)
        banned = _prohibited_phrases(known_claims)

        claims: List[Dict[str, Any]] = []
        seen_norm: set = set()

        for channel, copy in texts.items():
            for span in _split_spans(copy):
                norm = _normalize(span)
                if norm in seen_norm:
                    continue
                seen_norm.add(norm)

                status, source, evidence, confidence = self._classify(norm, verified_idx, banned)
                if status is None:
                    continue

                claim_id = f"claim_{len(claims)}"
                overridden = self._is_overridden(founder_overrides, claim_id, norm, span)
                gate_action, decision = self._decide(status, overridden)

                claims.append({
                    "id": claim_id,
                    "text": span,
                    "channel": channel,
                    "source": source,
                    "evidence": evidence,
                    "confidence": confidence,
                    "status": status,
                    "gate_action": gate_action,
                    "decision": decision,
                })

        interventions = self._build_interventions(claims)
        summary = {
            "verified": sum(1 for c in claims if c["status"] == "VERIFIED"),
            "needs_evidence": sum(1 for c in claims if c["status"] == "NEEDS_EVIDENCE"),
            "prohibited": sum(1 for c in claims if c["status"] == "PROHIBITED"),
        }
        gate_status = "blocked" if summary["prohibited"] > 0 else "passed"

        # Best-effort LLM enrichment of Otto's phrasing ONLY. Never touches status,
        # decision, or gate_status. Runs only when a real provider is configured.
        if interventions and self._llm_available():
            try:
                await self._enrich(interventions)
            except Exception as e:  # pragma: no cover - enrichment is optional
                logger.info(f"Claims Otto enrichment skipped: {e}")

        return {
            "gate_status": gate_status,
            "summary": summary,
            "claims": claims,
            "otto_interventions": interventions,
        }

    # --- deterministic core ---------------------------------------------------

    def _classify(self, norm: str, verified_idx, banned):
        """Priority: PROHIBITED > VERIFIED > NEEDS_EVIDENCE > (not a tracked claim)."""
        if _PROHIBITED_RX.search(norm) or any(p in norm for p in banned):
            return "PROHIBITED", None, None, 0.92
        for entry in verified_idx:
            if entry["sig"] and entry["sig"] in norm:
                return "VERIFIED", entry["source"], entry["text"], 0.95
        if _QUANT_RX.search(norm):
            return "NEEDS_EVIDENCE", None, None, 0.6
        return None, None, None, 0.0

    def _is_overridden(self, overrides: Dict[str, Any], claim_id: str, norm: str, span: str) -> bool:
        for key in (claim_id, norm, span):
            if bool(overrides.get(key)):
                return True
        return False

    def _decide(self, status: str, overridden: bool):
        if status == "VERIFIED":
            return "allow", "ALLOWED_BY_EVIDENCE"
        if status == "PROHIBITED":
            # Amendment #2: overrides can NEVER clear a prohibited claim.
            return "block", "BLOCKED"
        # NEEDS_EVIDENCE
        if overridden:
            return "flag", "ALLOWED_BY_FOUNDER_OVERRIDE"
        return "flag", "NEEDS_OVERRIDE"

    def _snippet(self, text: str, limit: int = 90) -> str:
        return text if len(text) <= limit else text[:limit].rstrip() + "…"

    def _build_interventions(self, claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Otto's Observation -> Reason -> Action cards for risky claims."""
        out = []
        for c in claims:
            snip = self._snippet(c["text"])
            if c["status"] == "PROHIBITED":
                out.append({
                    "claim_id": c["id"],
                    "claim_text": c["text"],
                    "severity": "high",
                    "observation": f'Your {c["channel"].title()} copy claims: "{snip}".',
                    "reason": "Unqualified superlatives and absolute claims can't be substantiated and "
                              "create real credibility and compliance risk.",
                    "action": "Remove or rewrite this into a specific, evidence-backed outcome before publishing.",
                })
            elif c["status"] == "NEEDS_EVIDENCE" and c["decision"] == "NEEDS_OVERRIDE":
                out.append({
                    "claim_id": c["id"],
                    "claim_text": c["text"],
                    "severity": "medium",
                    "observation": f'The claim "{snip}" isn\'t backed by anything in your Brand Memory yet.',
                    "reason": "Quantitative claims without a cited source read as marketing fluff and are easy to challenge.",
                    "action": "Add supporting evidence to Brand Memory, or acknowledge the override to publish as-is.",
                })
        return out

    # --- optional LLM enrichment ---------------------------------------------

    def _llm_available(self) -> bool:
        """A real model is configured (not the offline mock fallback)."""
        return bool(
            settings.NVIDIA_NIM_API_KEY or settings.GEMINI_API_KEY or settings.OPENAI_API_KEY
        )

    async def _enrich(self, interventions: List[Dict[str, Any]]) -> None:
        """Rewrite only the 'action' lines for sharper phrasing; strict validation."""
        system_prompt = (
            "You are Otto, a concise marketing evidence advisor. For each item, rewrite ONLY the "
            "'action' into one crisp, specific instruction. Preserve order and count. "
            "Return ONLY a JSON array of objects each having a single key 'action'."
        )
        payload = [
            {"observation": i["observation"], "reason": i["reason"], "action": i["action"]}
            for i in interventions
        ]
        raw = await self.provider.chat(system_prompt, json.dumps(payload))
        from app.utils.json_helper import extract_and_parse_json
        parsed = extract_and_parse_json(raw)
        if not isinstance(parsed, list) or len(parsed) != len(interventions):
            return
        for i, item in enumerate(parsed):
            if isinstance(item, dict) and item.get("action"):
                interventions[i]["action"] = str(item["action"]).strip()


claims_gate = ClaimsGate()
