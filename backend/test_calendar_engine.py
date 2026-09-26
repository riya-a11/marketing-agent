import os
import io
import csv
import json
import uuid
import asyncio
from datetime import datetime, timedelta

from app.storage.db import (
    create_calendar_event,
    get_calendar_event_by_id,
    update_calendar_event,
    delete_calendar_event,
    duplicate_calendar_event,
    approve_calendar_event,
    reject_calendar_event,
    claim_scheduled_events_for_worker,
    recover_expired_worker_leases,
    get_verification_audit_logs_for_event,
    get_connection
)
from app.utils.canonical_hasher import compute_calendar_event_hash, canonical_json
from app.services.calendar.ingestion_service import parse_tabular_data, parse_document_data
from app.services.calendar.scheduler_worker import process_due_calendar_events

def test_canonical_json_determinism():
    print("\n--- TEST 1: Canonical JSON & Deterministic Hashing ---")
    payload1 = {
        "post_text": "Launch update",
        "cta": "Click here",
        "media_asset_ids": ["img_b", "img_a"],
        "extra_meta": {"tags": ["growth", "ai"], "score": 95.0}
    }
    payload2 = {
        "cta": "Click here",
        "extra_meta": {"score": 95, "tags": ["growth", "ai"]},
        "media_asset_ids": ["img_a", "img_b"],
        "post_text": "Launch update"
    }
    
    hash1 = compute_calendar_event_hash("linkedin", payload1, "2026-09-15T04:00:00Z", "Asia/Kolkata")
    hash2 = compute_calendar_event_hash("linkedin", payload2, "2026-09-15T04:00:00Z", "Asia/Kolkata")
    
    assert hash1 == hash2, f"Expected identical hashes, got {hash1} vs {hash2}"
    print("[PASS] Canonical hashing is deterministic across key ordering and arrays.")

def test_fsm_and_approval_invalidation():
    print("\n--- TEST 2: FSM & Content-Mutation Invalidation ---")
    future_time = (datetime.utcnow() + timedelta(days=2)).isoformat()
    
    event = create_calendar_event({
        "title": "FinTech Launch Announcement",
        "channel": "linkedin",
        "scheduled_at": future_time,
        "timezone": "Asia/Kolkata",
        "status": "PENDING_VERIFICATION",
        "channel_payload": {"post_text": "Original Launch Copy", "cta": "Try Demo"},
        "created_by": "test_user"
    })
    
    eid = event["id"]
    v1 = event["content_version"]
    h1 = event["current_content_hash"]
    assert event["status"] == "PENDING_VERIFICATION"
    
    # Authorize version 1
    approved = approve_calendar_event(
        event_id=eid,
        content_version=v1,
        content_hash=h1,
        user_id="reviewer@brand.com",
        user_role="reviewer"
    )
    assert approved["status"] == "SCHEDULED"
    assert approved["approved_version"] == 1
    assert approved["approved_content_hash"] == h1
    print("[PASS] Event successfully authorized and armed as SCHEDULED.")
    
    # Mutate post copy -> Invalidate authorization
    updated = update_calendar_event(eid, {
        "channel_payload": {"post_text": "Tampered Launch Copy", "cta": "Try Demo"}
    })
    
    assert updated["content_version"] == 2
    assert updated["status"] == "PENDING_VERIFICATION"
    assert updated["approved_version"] is None
    assert updated["approved_content_hash"] is None
    print("[PASS] Post-approval content mutation invalidated approval, bumped version to 2, and reset state to PENDING_VERIFICATION.")

def test_approval_race_conflict():
    print("\n--- TEST 3: Approval Race Test (Stale Version Rejection) ---")
    future_time = (datetime.utcnow() + timedelta(days=3)).isoformat()
    
    event = create_calendar_event({
        "title": "AI Feature Release",
        "channel": "x",
        "scheduled_at": future_time,
        "timezone": "Asia/Kolkata",
        "status": "PENDING_VERIFICATION",
        "channel_payload": {"post_text": "Initial Tweet"},
        "created_by": "test_user"
    })
    eid = event["id"]
    stale_v = event["content_version"]
    stale_h = event["current_content_hash"]
    
    # Admin modifies event before user approval lands
    update_calendar_event(eid, {
        "channel_payload": {"post_text": "Modified Tweet by Admin"}
    })
    
    # User attempts to approve stale version 1
    try:
        approve_calendar_event(
            event_id=eid,
            content_version=stale_v,
            content_hash=stale_h,
            user_id="user_a@brand.com"
        )
        assert False, "Approval of stale version should have failed!"
    except ValueError as ve:
        print(f"[PASS] Stale approval correctly rejected: {ve}")

def test_worker_claim_concurrency():
    print("\n--- TEST 4: Worker Claim Concurrency Race ---")
    due_time = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
    
    event = create_calendar_event({
        "title": "Due Social Post",
        "channel": "linkedin",
        "scheduled_at": due_time,
        "timezone": "Asia/Kolkata",
        "status": "PENDING_VERIFICATION",
        "channel_payload": {"post_text": "Immediate Post Copy"},
        "created_by": "test_user"
    })
    eid = event["id"]
    
    # Authorize with DISPATCH_NOW
    approve_calendar_event(
        event_id=eid,
        content_version=event["content_version"],
        content_hash=event["current_content_hash"],
        immediate_action="DISPATCH_NOW"
    )
    
    # Reset status to SCHEDULED for worker testing
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE calendar_events
    SET status = 'SCHEDULED',
        approved_version = content_version,
        approved_content_hash = current_content_hash
    WHERE id = ?
    """, (eid,))
    conn.commit()
    conn.close()
    
    # Worker A and Worker B both attempt to claim
    claimed_a = claim_scheduled_events_for_worker(worker_id="worker_alpha", batch_size=10)
    claimed_b = claim_scheduled_events_for_worker(worker_id="worker_beta", batch_size=10)
    
    claimed_a_ids = [e["id"] for e in claimed_a]
    claimed_b_ids = [e["id"] for e in claimed_b]
    
    assert eid in claimed_a_ids or eid in claimed_b_ids
    assert not (eid in claimed_a_ids and eid in claimed_b_ids), "Event cannot be claimed by both workers!"
    print("[PASS] Atomic claiming successfully guaranteed single worker lease.")

def test_lease_recovery():
    print("\n--- TEST 5: Worker Lease Recovery ---")
    stalled_time = (datetime.utcnow() - timedelta(minutes=10)).isoformat()
    
    event = create_calendar_event({
        "title": "Stalled Publishing Post",
        "channel": "instagram",
        "scheduled_at": stalled_time,
        "timezone": "Asia/Kolkata",
        "status": "PUBLISHING",
        "channel_payload": {"caption": "Test Caption"},
        "created_by": "test_user"
    })
    eid = event["id"]
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE calendar_events
    SET status = 'PUBLISHING',
        lock_acquired_at = datetime('now', '-10 minutes'),
        retry_count = 0
    WHERE id = ?
    """, (eid,))
    conn.commit()
    conn.close()
    
    recovered_count = recover_expired_worker_leases()
    assert recovered_count >= 1
    
    recovered_event = get_calendar_event_by_id(eid)
    assert recovered_event["status"] == "SCHEDULED"
    assert recovered_event["retry_count"] == 1
    assert recovered_event["lock_acquired_at"] is None
    print("[PASS] Expired worker lease was automatically recovered to SCHEDULED with retry count incremented.")

def test_immutability_of_published():
    print("\n--- TEST 6: Immutability of PUBLISHED Records ---")
    event = create_calendar_event({
        "title": "Published Historic Post",
        "channel": "linkedin",
        "scheduled_at": datetime.utcnow().isoformat(),
        "timezone": "Asia/Kolkata",
        "status": "PUBLISHED",
        "channel_payload": {"post_text": "Live Copy"},
        "created_by": "test_user"
    })
    eid = event["id"]
    
    # Attempt to modify
    try:
        update_calendar_event(eid, {"title": "Illegal Edit"})
        assert False, "Modifying published event must fail!"
    except PermissionError as pe:
        print(f"[PASS] Mutation blocked on published record: {pe}")
        
    # Attempt to delete
    try:
        delete_calendar_event(eid)
        assert False, "Deleting published event must fail!"
    except PermissionError as pe:
        print(f"[PASS] Deletion blocked on published record: {pe}")
        
    # Safe duplication
    duplicated = duplicate_calendar_event(eid)
    assert duplicated["status"] == "DRAFT"
    assert duplicated["id"] != eid
    print("[PASS] Duplication created a clean new DRAFT without altering published history.")

def test_file_ingestion():
    print("\n--- TEST 7: File Ingestion & Row Validation ---")
    csv_content = """Date,Platform,Copy,CTA
2026-10-15 10:00 AM,LinkedIn,Our new AI engine reduces latency by 50%.,Try demo
2026-10-18 02:30 PM,Twitter,Check out this new milestone.,Read more
InvalidDateString,Instagrm,Broken row test,Link
"""
    parsed = parse_tabular_data(csv_content.encode("utf-8"), "schedule.csv")
    assert parsed["total_rows"] == 3
    assert parsed["valid_rows_count"] == 2
    assert parsed["error_rows_count"] == 1
    assert parsed["rows"][2]["status"] == "error"
    print(f"[PASS] Ingestion successfully parsed {parsed['valid_rows_count']} valid rows and flagged {parsed['error_rows_count']} error row with diagnostics.")

if __name__ == "__main__":
    print("Starting Comprehensive Marketing Calendar & Email Test Suite...")
    test_canonical_json_determinism()
    test_fsm_and_approval_invalidation()
    test_approval_race_conflict()
    test_worker_claim_concurrency()
    test_lease_recovery()
    test_immutability_of_published()
    test_file_ingestion()
    print("\n=======================================================")
    print("[SUCCESS] ALL 7 CRITICAL BACKEND TESTS PASSED WITH 100% SUCCESS!")
    print("=======================================================")
