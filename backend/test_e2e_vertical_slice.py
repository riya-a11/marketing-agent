"""
End-to-End Vertical Slice Integration Test for Marketing OS v2.1.

Validates the full enterprise pipeline across all boundaries:
    Stage 1: Studio "What happened?" -> 3 Strategic Angles
    Stage 2: Multi-Channel Package Generation -> Persisted Campaign Package
    Stage 3: Otto AI Claims Verification Gate -> Automated Truth Checking
    Stage 4: Marketing Calendar Scheduling -> Deterministic Canonical Hash & Version
    Stage 5: Human Compliance Gate -> Sign-Off & Hash Sealing (Optimistic Concurrency)
    Stage 6: Distributed Scheduler Worker -> Atomic Lease Claim & Multi-Platform Dispatch
    Stage 7: Provider Execution Receipt & Immutable Verification Audit Trail
"""

import asyncio
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.storage.db import (
    get_calendar_event_by_id,
    get_verification_audit_logs_for_event,
    get_connection,
)
from app.services.calendar.scheduler_worker import process_due_calendar_events

client = TestClient(app)

RAW_UPDATE = "A customer reduced invoice reconciliation from 3 days to 40 minutes using our new matching engine."


def test_complete_vertical_slice():
    print("\n=======================================================================")
    print("  MARKETING OS v2.1 — END-TO-END VERTICAL SLICE INTEGRATION TEST       ")
    print("=======================================================================\n")

    # -----------------------------------------------------------------
    # STAGE 1: Studio "What happened?" -> 3 Strategic Angles
    # -----------------------------------------------------------------
    print("[STAGE 1/7] Submitting Raw Milestone Update to Studio...")
    res = client.post("/api/v1/content/analyze-update", json={"raw_update": RAW_UPDATE})
    assert res.status_code == 200, f"analyze-update failed: {res.text}"
    body = res.json()
    angles = body.get("angles", [])
    assert len(angles) == 3, f"Expected 3 angles, got {len(angles)}"
    recommended = [a for a in angles if a.get("is_recommended")]
    assert len(recommended) == 1, "Expected exactly 1 recommended angle"
    chosen_angle = recommended[0]
    print(f"  [PASS] 3 Angles generated. Selected: '{chosen_angle['headline']}' ({chosen_angle['tag']})")

    # -----------------------------------------------------------------
    # STAGE 2: Multi-Channel Package Generation
    # -----------------------------------------------------------------
    print("\n[STAGE 2/7] Generating Multi-Channel Campaign Package...")
    res = client.post(
        "/api/v1/content/generate-campaign-package",
        json={"raw_update": RAW_UPDATE, "selected_angle": chosen_angle},
    )
    assert res.status_code == 200, f"generate-campaign-package failed: {res.text}"
    pkg = res.json()
    campaign_id = pkg.get("campaign_id")
    channels = pkg.get("channels", {})
    assert campaign_id and campaign_id.startswith("camp_"), f"Invalid campaign_id: {campaign_id}"
    assert "linkedin" in channels and "x" in channels, "Missing required channel copy"
    linkedin_text = channels["linkedin"]
    print(f"  [PASS] Campaign Package generated & persisted (ID: {campaign_id})")
    print(f"  [PASS] Channels ready: {list(channels.keys())}")

    # -----------------------------------------------------------------
    # STAGE 3: Otto AI Claims Verification Gate
    # -----------------------------------------------------------------
    print("\n[STAGE 3/7] Running Otto AI Claims Verification Gate...")
    res = client.post(
        "/api/v1/content/verify-claims",
        json={"channels": {"linkedin": linkedin_text}, "campaign_id": campaign_id},
    )
    assert res.status_code == 200, f"verify-claims failed: {res.text}"
    gate = res.json()
    gate_status = gate.get("gate_status")
    assert gate_status in ["passed", "blocked"], f"Invalid gate status: {gate_status}"
    print(f"  [PASS] Claims Gate evaluation complete: status={gate_status}")

    # -----------------------------------------------------------------
    # STAGE 4: Marketing Calendar Scheduling
    # -----------------------------------------------------------------
    print("\n[STAGE 4/7] Scheduling LinkedIn Post into Master Content Calendar...")
    scheduled_future = (datetime.utcnow() + timedelta(hours=2)).isoformat()
    event_payload = {
        "title": f"Launch: {chosen_angle['headline']}",
        "channel": "linkedin",
        "scheduled_at": scheduled_future,
        "timezone": "Asia/Kolkata",
        "status": "PENDING_VERIFICATION",
        "channel_payload": {
            "post_text": linkedin_text,
            "campaign_id": campaign_id,
            "cta": "Read our technical benchmark",
            "media_asset_ids": [],
        },
        "created_by": "lead_growth_agent@marketing-os.net",
    }
    res = client.post("/api/v1/calendar/events", json=event_payload)
    assert res.status_code == 200, f"Failed to schedule event: {res.text}"
    created_event = res.json()
    event_id = created_event["id"]
    content_version = created_event.get("content_version", 1)
    content_hash = created_event.get("current_content_hash")
    assert created_event["status"] == "PENDING_VERIFICATION"
    assert content_hash, "Event missing canonical content hash"
    print(f"  [PASS] Event scheduled in PENDING_VERIFICATION (ID: {event_id})")
    print(f"  [PASS] Sealed Version {content_version} | Canonical Hash: {content_hash[:16]}...")

    # -----------------------------------------------------------------
    # STAGE 5: Human Compliance Gate & Hash Sealing
    # -----------------------------------------------------------------
    print("\n[STAGE 5/7] Executing Human Compliance Sign-Off & Sealing Hash...")
    res = client.post(
        f"/api/v1/calendar/events/{event_id}/approve",
        json={
            "content_version": content_version,
            "content_hash": content_hash,
            "notes": "Verified enterprise metric with customer success. Approved for live release.",
        },
    )
    assert res.status_code == 200, f"Approval failed: {res.text}"
    approved_body = res.json()
    approved_event = approved_body.get("event", approved_body)
    assert approved_event["status"] == "SCHEDULED", f"Expected SCHEDULED, got {approved_event['status']}"
    assert approved_event.get("approved_version") == content_version
    assert approved_event.get("approved_content_hash") == content_hash
    print(f"  [PASS] Compliance Gate Passed! Event armed for dispatch. Status: {approved_event['status']}")

    # -----------------------------------------------------------------
    # STAGE 6: Distributed Scheduler Worker Lease Claim & Platform Dispatch
    # -----------------------------------------------------------------
    print("\n[STAGE 6/7] Running Background Worker Lease Claim & Platform Dispatch...")
    # Fast-forward event schedule time to simulate due state for worker pickup
    past_due_iso = (datetime.utcnow() - timedelta(minutes=2)).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE calendar_events SET scheduled_at = ? WHERE id = ?", (past_due_iso, event_id))
    conn.commit()
    conn.close()

    dispatched = asyncio.run(process_due_calendar_events(worker_id="worker_e2e_integration"))
    matching = [d for d in dispatched if d["event_id"] == event_id]
    assert len(matching) == 1, f"Worker failed to claim and dispatch event {event_id}. Dispatched: {dispatched}"
    disp_result = matching[0]["result"]
    assert disp_result["status"] == "SUCCESS", f"Dispatch failed: {disp_result}"
    print(f"  [PASS] Worker acquired atomic lease and dispatched to platform adapter!")
    print(f"  [PASS] Provider Post ID: {disp_result.get('external_post_id')}")

    # -----------------------------------------------------------------
    # STAGE 7: Provider Receipt & Immutable Verification Audit Ledger
    # -----------------------------------------------------------------
    print("\n[STAGE 7/7] Verifying Provider Execution Receipt and Immutable Audit Trail...")
    final_event = get_calendar_event_by_id(event_id)
    assert final_event is not None
    assert final_event["status"] == "PUBLISHED", f"Expected final status PUBLISHED, got {final_event['status']}"

    audit_logs = get_verification_audit_logs_for_event(event_id)
    actions = [log["action"] for log in audit_logs]
    print(f"  [PASS] Recorded Verification Audit Log Actions: {actions}")
    assert "APPROVED" in actions, "Audit missing APPROVED entry"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM social_publications WHERE id = ?", (f"pub_{event_id}",))
    pub_receipt = cursor.fetchone()
    conn.close()
    assert pub_receipt is not None, f"Publication receipt missing for pub_{event_id}"
    receipt_dict = dict(pub_receipt)
    assert receipt_dict["status"] == "published"
    print(f"  [PASS] Publication Receipt Confirmed in social_publications ledger (ID: {receipt_dict['id']})")

    print("\n=======================================================================")
    print("  [PASS] COMPLETE MARKETING OS VERTICAL SLICE FULLY VERIFIED (100% PASS)  ")
    print("=======================================================================\n")


if __name__ == "__main__":
    test_complete_vertical_slice()
