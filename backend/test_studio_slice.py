"""
Vertical-slice contract test for the Marketing OS Studio journey.

Exercises the EXACT user path offline (no API keys, simulated provider):

    "What happened?"  ->  3 strategic angles
                      ->  multi-channel campaign package (persisted, campaign_id)
                      ->  Claims Verification Gate (block / pass / mixed / override)
                      ->  multi-publish reusing campaign_id (backend-derived keys)
                      ->  real permalinks + idempotent replay

Run with the backend venv:
    backend/venv/Scripts/python.exe test_studio_slice.py
or via pytest:
    backend/venv/Scripts/python.exe -m pytest test_studio_slice.py -v
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

RAW_UPDATE = "A customer reduced invoice reconciliation from 3 days to 40 minutes using our new matching engine."


def _find(claims, status):
    return [c for c in claims if c["status"] == status]


def test_studio_vertical_slice():
    print("=== MARKETING OS — STUDIO VERTICAL SLICE (SIMULATED PROVIDER) ===")

    # -----------------------------------------------------------------
    # Step 1 — "What happened?" -> exactly 3 strategic angles
    # -----------------------------------------------------------------
    res = client.post("/api/v1/content/analyze-update", json={"raw_update": RAW_UPDATE})
    assert res.status_code == 200, f"analyze-update failed: {res.text}"
    body = res.json()
    angles = body.get("angles")
    assert isinstance(angles, list) and len(angles) == 3, f"Expected exactly 3 angles, got {angles}"

    required_angle_keys = {"id", "tag", "is_recommended", "headline", "rationale", "evidence_used"}
    for a in angles:
        missing = required_angle_keys - set(a.keys())
        assert not missing, f"Angle missing keys {missing}: {a}"
    recommended = [a for a in angles if a.get("is_recommended")]
    assert len(recommended) == 1, f"Expected exactly one recommended angle, got {len(recommended)}"
    print(f"[PASS] Step 1: 3 well-formed angles, 1 recommended -> '{recommended[0]['headline']}'")

    # Shape-regression guard: real key is `headline`, not `title` (catches the
    # mock-substring bug where /analyze-update returned brand-memory JSON).
    assert "headline" in angles[0] and "title" not in angles[0], "Angle shape regressed to wrong provider branch"
    print("[PASS] Shape-regression guard: analyze-update returns the ANGLE shape (not brand memory)")

    # -----------------------------------------------------------------
    # Step 2 — generate multi-channel campaign package (persisted)
    # -----------------------------------------------------------------
    res = client.post(
        "/api/v1/content/generate-campaign-package",
        json={"raw_update": RAW_UPDATE, "selected_angle": recommended[0]},
    )
    assert res.status_code == 200, f"generate-campaign-package failed: {res.text}"
    package = res.json()
    channels = package.get("channels")
    assert isinstance(channels, dict), f"Package missing channels dict: {package}"
    for ch in ("linkedin", "x", "instagram", "video"):
        assert ch in channels, f"Package missing '{ch}' channel: {list(channels.keys())}"

    campaign_id = package.get("campaign_id")
    assert campaign_id and campaign_id.startswith("camp_"), f"Package did not return a campaign_id: {package.get('campaign_id')}"
    assert package.get("version") == 1, "Package should return version 1"
    print(f"[PASS] Step 2: 4-channel package generated + persisted (campaign_id={campaign_id})")

    # -----------------------------------------------------------------
    # Step 3 — Claims Gate BLOCKS a prohibited superlative
    # -----------------------------------------------------------------
    res = client.post(
        "/api/v1/content/verify-claims",
        json={
            "channels": {"linkedin": "Meet the industry's fastest platform for finance teams."},
            "campaign_id": campaign_id,
        },
    )
    assert res.status_code == 200, f"verify-claims (prohibited) failed: {res.text}"
    gate = res.json()
    assert gate["gate_status"] == "blocked", f"Prohibited superlative was NOT blocked: {gate}"
    assert gate["summary"]["prohibited"] >= 1, "Expected >=1 PROHIBITED claim"
    prohibited = _find(gate["claims"], "PROHIBITED")
    assert prohibited and prohibited[0]["decision"] == "BLOCKED", "Prohibited claim decision must be BLOCKED"
    # Otto intervention present and well-formed for the blocked claim.
    interventions = gate.get("otto_interventions", [])
    assert any(i.get("severity") == "high" for i in interventions), "Expected a high-severity Otto intervention"
    for i in interventions:
        assert {"observation", "reason", "action"} <= set(i.keys()), f"Otto intervention shape wrong: {i}"
    print("[PASS] Step 3: prohibited superlative ('fastest') hard-blocked with Otto intervention")

    # -----------------------------------------------------------------
    # Step 4 — Clean content PASSES
    # -----------------------------------------------------------------
    res = client.post(
        "/api/v1/content/verify-claims",
        json={
            "channels": {
                "linkedin": "We shipped a new reconciliation dashboard for finance teams.\n\n"
                            "It is now available to every customer."
            }
        },
    )
    assert res.status_code == 200, f"verify-claims (clean) failed: {res.text}"
    gate = res.json()
    assert gate["gate_status"] == "passed", f"Clean content should pass: {gate}"
    assert gate["summary"]["prohibited"] == 0, "Clean content should have 0 prohibited claims"
    print("[PASS] Step 4: clean content passes the gate")

    # -----------------------------------------------------------------
    # Step 5 — Mixed status (Refinement #9)
    #   VERIFIED + NEEDS_EVIDENCE            -> passed
    #   VERIFIED + NEEDS_EVIDENCE + PROHIBITED -> blocked
    # -----------------------------------------------------------------
    known_claims = [{"text": "72% faster", "status": "verified", "source": "Beta benchmark data"}]

    res = client.post(
        "/api/v1/content/verify-claims",
        json={
            "channels": {
                "linkedin": "We are now 72% faster.\n\nTeams save hundreds of hours every quarter."
            },
            "known_claims": known_claims,
        },
    )
    gate = res.json()
    assert gate["gate_status"] == "passed", f"VERIFIED+NEEDS_EVIDENCE should pass: {gate}"
    assert gate["summary"]["verified"] >= 1, "Expected a VERIFIED claim (72% faster)"
    assert gate["summary"]["needs_evidence"] >= 1, "Expected a NEEDS_EVIDENCE claim (hundreds of hours)"
    print("[PASS] Step 5a: VERIFIED + NEEDS_EVIDENCE -> passed")

    res = client.post(
        "/api/v1/content/verify-claims",
        json={
            "channels": {
                "linkedin": "We are now 72% faster.\n\nTeams save hundreds of hours every quarter.\n\n"
                            "We built the fastest platform on the market."
            },
            "known_claims": known_claims,
        },
    )
    gate = res.json()
    assert gate["gate_status"] == "blocked", f"Adding a PROHIBITED claim must block: {gate}"
    assert gate["summary"]["verified"] >= 1 and gate["summary"]["prohibited"] >= 1
    print("[PASS] Step 5b: VERIFIED + NEEDS_EVIDENCE + PROHIBITED -> blocked")

    # -----------------------------------------------------------------
    # Step 6 — Founder override enforcement (Amendment #2)
    # -----------------------------------------------------------------
    # 6a. NEEDS_EVIDENCE alone: passes gate but decision is NEEDS_OVERRIDE.
    res = client.post(
        "/api/v1/content/verify-claims",
        json={"channels": {"linkedin": "Teams save hundreds of hours every quarter."}},
    )
    gate = res.json()
    ne = _find(gate["claims"], "NEEDS_EVIDENCE")
    assert ne, "Expected a NEEDS_EVIDENCE claim"
    assert ne[0]["decision"] == "NEEDS_OVERRIDE", f"Un-overridden claim should be NEEDS_OVERRIDE: {ne[0]}"
    ne_id = ne[0]["id"]

    # 6b. Same claim WITH a founder override -> ALLOWED_BY_FOUNDER_OVERRIDE.
    res = client.post(
        "/api/v1/content/verify-claims",
        json={
            "channels": {"linkedin": "Teams save hundreds of hours every quarter."},
            "founder_overrides": {ne_id: True},
        },
    )
    gate = res.json()
    ne = _find(gate["claims"], "NEEDS_EVIDENCE")
    assert ne and ne[0]["decision"] == "ALLOWED_BY_FOUNDER_OVERRIDE", (
        f"Founder override should allow NEEDS_EVIDENCE: {ne}"
    )
    assert gate["gate_status"] == "passed"
    print("[PASS] Step 6a: founder override moves NEEDS_EVIDENCE -> ALLOWED_BY_FOUNDER_OVERRIDE")

    # 6c. PROHIBITED WITH a founder override -> STILL BLOCKED (uncircumventable).
    res = client.post(
        "/api/v1/content/verify-claims",
        json={"channels": {"linkedin": "This is the fastest platform."}},
    )
    gate = res.json()
    pro = _find(gate["claims"], "PROHIBITED")
    assert pro, "Expected a PROHIBITED claim"
    pro_id = pro[0]["id"]

    res = client.post(
        "/api/v1/content/verify-claims",
        json={
            "channels": {"linkedin": "This is the fastest platform."},
            "founder_overrides": {pro_id: True},
        },
    )
    gate = res.json()
    pro = _find(gate["claims"], "PROHIBITED")
    assert pro and pro[0]["decision"] == "BLOCKED", f"Override must NOT clear PROHIBITED: {pro}"
    assert gate["gate_status"] == "blocked", "Gate must stay blocked despite override on PROHIBITED"
    print("[PASS] Step 6b: founder override CANNOT clear a PROHIBITED claim (stays BLOCKED)")

    # -----------------------------------------------------------------
    # Step 7 — Publish reusing campaign_id + version_no (backend-derived keys)
    # -----------------------------------------------------------------
    publish_payload = {
        "platforms": ["linkedin", "x"],
        "platform_content": {
            "linkedin": {"post_text": channels["linkedin"].get("post_text", "Reconciliation in 40 minutes.")},
            "x": {"post_text": channels["x"].get("post_text", "3 days -> 40 minutes.")},
        },
        "cta": "See the walkthrough",
        "campaign_id": campaign_id,
        "version_no": 1,
        "title": package.get("campaign_title", "Reconciliation Campaign"),
        "mode": "direct_api",
    }
    res = client.post("/api/v1/campaigns/multi-publish", json=publish_payload)
    assert res.status_code == 200, f"multi-publish failed: {res.text}"
    pub = res.json()
    assert pub["campaign_id"] == campaign_id, "Publish must reuse the generation campaign_id"
    assert pub["succeeded"] >= 1, f"Expected >=1 successful publication: {pub}"
    published_platforms = [r["platform"] for r in pub["results"] if r["status"] == "published"]
    for r in pub["results"]:
        if r["status"] == "published":
            assert r.get("permalink"), f"Published result missing permalink: {r}"
    print(f"[PASS] Step 7: multi-publish reused campaign_id -> {len(published_platforms)} live receipt(s)")

    # 7b. Idempotent replay: same campaign_id + version_no + no explicit key
    #     -> backend derives the SAME idemp:{campaign_id}:{platform}:v1 key.
    res_replay = client.post("/api/v1/campaigns/multi-publish", json=publish_payload)
    assert res_replay.status_code == 200
    replay = res_replay.json()
    replayed = [r for r in replay["results"] if r["status"] == "published"]
    assert replayed, "Replay produced no published results"
    for r in replayed:
        if r["platform"] in published_platforms:
            assert r.get("is_idempotent_replay") is True, (
                f"Backend-derived idempotency failed for {r['platform']}: {r}"
            )
    print("[PASS] Step 7b: replay of campaign_id+version_no hit backend-derived idempotency keys")

    # 8. Fail-closed gate: if the gate itself errors, the endpoint must NOT return
    #    "passed". A crash-to-passed would be a bypass around Amendment #2.
    from app.api import content as content_api

    original_verify = content_api.claims_gate.verify

    async def _boom(*_a, **_kw):
        raise RuntimeError("simulated gate failure")

    content_api.claims_gate.verify = _boom
    try:
        res = client.post(
            "/api/v1/content/verify-claims",
            json={"channels": {"linkedin": "Anything at all."}},
        )
        assert res.status_code == 200, f"verify-claims must not 500: {res.text}"
        broken = res.json()
        assert broken["gate_status"] == "blocked", (
            f"Gate must fail CLOSED, got {broken['gate_status']}"
        )
        assert broken["otto_interventions"], "Fail-closed gate must explain itself to the founder"
        assert broken["otto_interventions"][0]["severity"] == "high"
    finally:
        content_api.claims_gate.verify = original_verify

    print("[PASS] Step 8: gate errors fail CLOSED (blocked), never silently passed")

    print("\n=== STUDIO VERTICAL SLICE: ALL CONTRACT TESTS PASSED (OFFLINE) ===")


if __name__ == "__main__":
    test_studio_vertical_slice()
