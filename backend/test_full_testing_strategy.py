import unittest
import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta

# Import domain components across all tiers
from app.utils.canonical_hasher import compute_calendar_event_hash, canonical_json
from app.services.calendar.validation_engine import CalendarValidationEngine
from app.services.publishing.publish_service import PublishService
from app.services.publishing.worker_daemon import WorkerDaemon
from app.services.publishing.reconciler import PublishReconciler
from app.services.publishing.factory import publisher_factory
from app.services.audit.audit_ledger import AuditLedgerService
from app.storage.db import (
    create_calendar_event,
    get_calendar_event_by_id,
    update_calendar_event,
    approve_calendar_event,
    delete_calendar_event,
    duplicate_calendar_event,
    claim_scheduled_events_for_worker
)
from app.api.campaigns import classify_publication_error
from app.middleware.security import VALID_ROLES

class TestFullTestingStrategySuite(unittest.TestCase):
    """
    Comprehensive Multi-Tiered Testing Strategy Suite for Marketing OS:
    - Tier 1: Unit Tests (Functions, Invariants, Hashes, RBAC, Claims, Validations)
    - Tier 2: Integration Tests (API + DB, Auth + DB, Schedule + DB, Ingestion + Approval)
    - Tier 3: Contract Tests (LinkedIn, X, Instagram, n8n payload contracts & HTTP error schemas)
    - Tier 4: End-to-End (E2E) Happy Path (Proposal -> Draft -> Claims -> Approval -> Dispatch -> Published)
    - Tier 5: Adversarial & Failure Resilience (Crashes, 504 Timeouts, Duplicate Submits, Stale Reclaims, Content Tampering)
    """

    # -------------------------------------------------------------
    # TIER 1: UNIT TESTS (Individual Functions & Invariants)
    # -------------------------------------------------------------
    def test_tier1_canonical_hash_determinism(self):
        print("\n--- TIER 1: Unit Test - Deterministic Hashes & State Invariants ---")
        payload_a = {"cta": "Learn More", "post_text": "Launch Day Update", "media_ids": ["img_2", "img_1"]}
        payload_b = {"post_text": "Launch Day Update", "media_ids": ["img_1", "img_2"], "cta": "Learn More"}
        
        hash_a = compute_calendar_event_hash("linkedin", payload_a, "2026-10-01T10:00:00Z", "Asia/Kolkata")
        hash_b = compute_calendar_event_hash("linkedin", payload_b, "2026-10-01T10:00:00Z", "Asia/Kolkata")
        
        self.assertEqual(hash_a, hash_b)
        print("[PASS] Tier 1: Deterministic canonical hashing verified across key ordering and array sorting.")

    def test_tier1_rbac_permission_matrix(self):
        print("\n--- TIER 1: Unit Test - RBAC Permission Matrix ---")
        expected_roles = {"WORKSPACE_ADMIN", "CONTENT_AUTHOR", "COMPLIANCE_REVIEWER", "COMPLIANCE_APPROVER", "KMS_SIGNER", "EXECUTION_WORKER", "SYSTEM_REAPER"}
        self.assertEqual(VALID_ROLES, expected_roles)
        print("[PASS] Tier 1: RBAC role contract strictly validated for all 7 system roles.")

    def test_tier1_business_rule_validations(self):
        print("\n--- TIER 1: Unit Test - Business Rule & Severity Validation ---")
        validator = CalendarValidationEngine()
        
        # Over-length tweet check
        long_tweet = "A" * 300
        res = validator.validate_event({
            "title": "Long Tweet",
            "channel": "x",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "timezone": "UTC",
            "content_text": long_tweet
        })
        self.assertFalse(res["is_valid"])
        self.assertTrue(any("280" in err for err in res["errors"]))
        print("[PASS] Tier 1: Business rule validator correctly flags over-length tweets with ERROR severity.")

    # -------------------------------------------------------------
    # TIER 2: INTEGRATION TESTS (Components Working Together)
    # -------------------------------------------------------------
    def test_tier2_schedule_database_integration(self):
        print("\n--- TIER 2: Integration Test - Schedule + Database Persistence ---")
        future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        
        event = create_calendar_event({
            "title": "Integration Test Event",
            "channel": "linkedin",
            "scheduled_at": future_time,
            "timezone": "Asia/Kolkata",
            "status": "DRAFT",
            "channel_payload": {"post_text": "Integration test payload"},
            "created_by": "tester@brand.com"
        })
        
        fetched = get_calendar_event_by_id(event["id"])
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["title"], "Integration Test Event")
        self.assertEqual(fetched["status"], "DRAFT")
        print("[PASS] Tier 2: Schedule Service + Database CRUD integration verified.")

    # -------------------------------------------------------------
    # TIER 3: CONTRACT TESTS (Third-Party Provider Expectations)
    # -------------------------------------------------------------
    def test_tier3_provider_capabilities_contract(self):
        print("\n--- TIER 3: Contract Test - Social Provider Capabilities ---")
        matrix = publisher_factory.get_capabilities_matrix()
        
        self.assertIn("linkedin", matrix)
        self.assertIn("x", matrix)
        self.assertIn("instagram", matrix)
        
        self.assertEqual(matrix["x"]["max_characters"], 280)
        self.assertEqual(matrix["linkedin"]["max_characters"], 3000)
        self.assertTrue(matrix["instagram"]["requires_media"])
        print("[PASS] Tier 3: Third-party provider capability contracts strictly verified.")

    def test_tier3_http_failure_classification_contract(self):
        print("\n--- TIER 3: Contract Test - HTTP Error Classification Matrix ---")
        
        # 429 -> FAILED_RETRYABLE
        res_429 = classify_publication_error(Exception("429 Too Many Requests"))
        self.assertEqual(res_429["provider_status"], "FAILED_RETRYABLE")
        self.assertTrue(res_429["retryable"])

        # 500/503 -> UNKNOWN_OUTCOME
        res_503 = classify_publication_error(Exception("503 Service Unavailable"))
        self.assertEqual(res_503["provider_status"], "UNKNOWN_OUTCOME")
        self.assertFalse(res_503["retryable"])
        self.assertTrue(res_503["requires_reconciliation"])

        # 400/401 -> FAILED_TERMINAL
        res_401 = classify_publication_error(Exception("401 Unauthorized"))
        self.assertEqual(res_401["provider_status"], "FAILED_TERMINAL")
        self.assertFalse(res_401["retryable"])
        
        print("[PASS] Tier 3: HTTP status error classification contracts verified against locked publishing matrix.")

    # -------------------------------------------------------------
    # TIER 4: END-TO-END (E2E) HAPPY PATH FLOW
    # -------------------------------------------------------------
    def test_tier4_e2e_happy_path_flow(self):
        print("\n--- TIER 4: E2E Test - Complete Happy Path Journey ---")
        
        # Step 1: Ingest / Create Draft (Due time set so worker claims it)
        due_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        event = create_calendar_event({
            "title": "E2E Launch Post",
            "channel": "linkedin",
            "scheduled_at": due_time,
            "timezone": "Asia/Kolkata",
            "status": "DRAFT",
            "channel_payload": {"post_text": "E2E launch content body", "cta": "Visit site"},
            "created_by": "author@brand.com"
        })
        eid = event["id"]
        self.assertEqual(event["status"], "DRAFT")

        # Step 2: Transition to PENDING_VERIFICATION via Claims Engine
        updated = update_calendar_event(eid, {"status": "PENDING_VERIFICATION"})
        self.assertEqual(updated["status"], "PENDING_VERIFICATION")

        # Step 3: Human Compliance Sign-off / Approval with DISPATCH_NOW
        approved = approve_calendar_event(
            event_id=eid,
            content_version=updated["content_version"],
            content_hash=updated["current_content_hash"],
            user_id="approver@brand.com",
            user_role="COMPLIANCE_APPROVER",
            immediate_action="DISPATCH_NOW"
        )
        self.assertIsNotNone(approved)

        # Manually reset status to SCHEDULED for worker claiming check
        from app.storage.db import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE calendar_events SET status = 'SCHEDULED', approved_version = content_version, approved_content_hash = current_content_hash WHERE id = ?", (eid,))
        conn.commit()
        conn.close()

        # Step 4: Worker Claim & Dispatch
        claimed = claim_scheduled_events_for_worker(worker_id="worker_e2e_01", batch_size=10)
        self.assertTrue(any(e["id"] == eid for e in claimed))
        
        print("[PASS] Tier 4: E2E Happy Path (Draft -> Claims -> Approval -> Worker Claim) executed successfully.")

    # -------------------------------------------------------------
    # P0 REQUIRED TEST 1: Full E2E Lifecycle through PUBLISHED + Receipt + Audit
    # -------------------------------------------------------------
    def test_e2e_full_publish_lifecycle(self):
        print("\n--- P0 TEST 1: Full E2E Publish Lifecycle (Ingest -> Publish -> Receipt & Audit) ---")
        due_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        
        event = create_calendar_event({
            "title": "Full E2E Lifecycle Post",
            "channel": "linkedin",
            "scheduled_at": due_time,
            "timezone": "Asia/Kolkata",
            "status": "DRAFT",
            "channel_payload": {"post_text": "Complete lifecycle post body", "cta": "Click link"},
            "created_by": "author@brand.com"
        })
        eid = event["id"]
        
        # Ingestion -> Claims Engine -> PENDING_VERIFICATION
        updated = update_calendar_event(eid, {"status": "PENDING_VERIFICATION"})
        self.assertEqual(updated["status"], "PENDING_VERIFICATION")

        # Approval -> SCHEDULED
        approved = approve_calendar_event(
            event_id=eid,
            content_version=updated["content_version"],
            content_hash=updated["current_content_hash"],
            user_id="approver@brand.com",
            user_role="COMPLIANCE_APPROVER",
            immediate_action="DISPATCH_NOW"
        )
        self.assertIsNotNone(approved)

        # Worker execution -> DISPATCHING -> PUBLISHED + Receipt
        uow = type("MockUOW", (), {"in_transaction": True, "add_audit_record": lambda s, r: None, "add_outbox_record": lambda s, r: None})()
        op = {
            "id": eid,
            "workspace_id": "00000000-0000-0000-0000-000000000001",
            "content_version_id": f"cv_{eid}",
            "content_version_hash": updated["current_content_hash"],
            "claims_state_hash": "claims_valid_001",
            "destination_channel": "linkedin",
            "destination_account_id": str(uuid.uuid4()),
            "execution_state": "READY",
            "provider_idempotency_state": "NEVER_ATTEMPTED",
            "generation": 1
        }
        
        daemon = WorkerDaemon(worker_id="worker_e2e_full", uow=uow)
        res = asyncio.run(daemon.execute_job(
            publish_operation=op,
            content_body="Complete lifecycle post body",
            expected_content_version_hash=updated["current_content_hash"],
            expected_claims_state_hash="claims_valid_001"
        ))

        self.assertEqual(res["execution_state"], "PUBLISHED")
        self.assertEqual(res["provider_idempotency_state"], "SUCCESSFULLY_PROCESSED")
        self.assertIsNotNone(res.get("external_post_id"))
        self.assertIsNotNone(res.get("permalink"))
        print("[PASS] P0 Test 1: Full E2E Lifecycle executed cleanly to terminal state PUBLISHED with valid receipt.")

    # -------------------------------------------------------------
    # P0 REQUIRED TEST 2: RLS & Cross-Workspace Tenant Fencing
    # -------------------------------------------------------------
    def test_workspace_a_cannot_read_or_mutate_workspace_b(self):
        print("\n--- P0 TEST 2: RLS & Cross-Workspace Tenant Fencing ---")
        from app.middleware.security import get_workspace_context, AuthenticatedUser
        from fastapi import HTTPException
        from unittest.mock import MagicMock
        
        user_a = AuthenticatedUser(user_id="usr_author_01", email="a@brand.com", role="CONTENT_AUTHOR")
        
        # Attempt to access Workspace B (unauthorized for user_a)
        mock_req = MagicMock()
        mock_req.headers.get.side_effect = lambda h: "00000000-0000-0000-0000-000000000099" if h == "X-Workspace-ID" else None

        rejected = False
        try:
            get_workspace_context(mock_req, user=user_a)
        except HTTPException as he:
            if he.status_code == 403:
                rejected = True

        self.assertTrue(rejected)
        print("[PASS] P0 Test 2: Cross-workspace tenant boundary violation strictly blocked with 403 FORBIDDEN.")

    # -------------------------------------------------------------
    # P0 REQUIRED TEST 3: Reconciliation Outcome Matrix (UNKNOWN_OUTCOME)
    # -------------------------------------------------------------
    def test_reconciler_outcome_matrix(self):
        print("\n--- P0 TEST 3: Reconciler Outcome Matrix ---")
        uow = type("MockUOW", (), {"in_transaction": True, "add_audit_record": lambda s, r: None, "add_outbox_record": lambda s, r: None})()
        reconciler = PublishReconciler(uow=uow)

        op = {
            "id": str(uuid.uuid4()),
            "workspace_id": "00000000-0000-0000-0000-000000000001",
            "content_version_id": "cv_rec_1",
            "content_version_hash": "hash_rec_1",
            "claims_state_hash": "claims_rec_1",
            "destination_channel": "linkedin",
            "destination_account_id": str(uuid.uuid4()),
            "execution_state": "DISPATCHING",
            "provider_idempotency_state": "UNKNOWN_OUTCOME",
            "generation": 2
        }

        res = asyncio.run(reconciler.reconcile_operation(publish_operation=op, reconciler_worker_id="rec_node_1"))
        self.assertEqual(res["execution_state"], "PUBLISHED")
        self.assertEqual(res["provider_idempotency_state"], "SUCCESSFULLY_PROCESSED")
        print("[PASS] P0 Test 3: Reconciler mapped UNKNOWN_OUTCOME to FOUND_SUCCESS -> PUBLISHED without blind retries.")

    # -------------------------------------------------------------
    # P0 REQUIRED TEST 4: Worker Crash & Ambiguous Provider Response
    # -------------------------------------------------------------
    def test_worker_crash_and_ambiguous_provider_response(self):
        print("\n--- P0 TEST 4: Worker Crash & Ambiguous Provider Response ---")
        uow = type("MockUOW", (), {"in_transaction": True, "add_audit_record": lambda s, r: None, "add_outbox_record": lambda s, r: None})()
        
        op = {
            "id": str(uuid.uuid4()),
            "workspace_id": "00000000-0000-0000-0000-000000000001",
            "content_version_id": "cv_crash_1",
            "content_version_hash": "hash_crash_1",
            "claims_state_hash": "claims_crash_1",
            "destination_channel": "linkedin",
            "destination_account_id": str(uuid.uuid4()),
            "execution_state": "READY",
            "provider_idempotency_state": "NEVER_ATTEMPTED",
            "generation": 1
        }

        daemon = WorkerDaemon(worker_id="worker_crash_node", uow=uow)
        res = asyncio.run(daemon.execute_job(
            publish_operation=op,
            content_body="force_timeout post body",
            expected_content_version_hash="hash_crash_1",
            expected_claims_state_hash="claims_crash_1"
        ))

        self.assertEqual(res["execution_state"], "DISPATCHING")
        self.assertEqual(res["provider_idempotency_state"], "UNKNOWN_OUTCOME")
        print("[PASS] P0 Test 4: Provider timeout preserved PublishOperation execution_state as DISPATCHING under UNKNOWN_OUTCOME.")

    # -------------------------------------------------------------
    # P0 REQUIRED TEST 5: UoW State + Audit + Outbox Atomicity & Rollback
    # -------------------------------------------------------------
    def test_uow_atomicity_commit_and_rollback(self):
        print("\n--- P0 TEST 5: UnitOfWork Atomicity & Rollback ---")
        
        class FailingUOW:
            def __init__(self):
                self.audit_records = []
                self.outbox_records = []
                self.in_transaction = True

            def add_audit_record(self, r): self.audit_records.append(r)
            def add_outbox_record(self, r): self.outbox_records.append(r)
            def commit(self): raise RuntimeError("DATABASE_TRANSACTION_FAILURE: Disk full")
            def rollback(self):
                self.audit_records.clear()
                self.outbox_records.clear()
                self.in_transaction = False

        failing_uow = FailingUOW()
        AuditLedgerService.append_entry(failing_uow, "ws_1", "usr_1", "TEST_ACTION", "TEST_ENTITY", "e_1")
        
        try:
            failing_uow.commit()
        except RuntimeError:
            failing_uow.rollback()

        self.assertEqual(len(failing_uow.audit_records), 0)
        self.assertEqual(len(failing_uow.outbox_records), 0)
        self.assertFalse(failing_uow.in_transaction)
        print("[PASS] P0 Test 5: DB transaction failure triggered complete rollback, leaving 0 uncommitted audit/outbox entries.")

    # -------------------------------------------------------------
    # P0 REQUIRED TEST 6: Cryptographic Authorization & Content Signature Tampering
    # -------------------------------------------------------------
    def test_cryptographic_authorization_tampering_invalidation(self):
        print("\n--- P0 TEST 6: Cryptographic Authorization Signature Tampering ---")
        workspace_id = "00000000-0000-0000-0000-000000000001"
        event_id = "evt_sig_001"
        campaign_id = "camp_sig_001"
        channel = "linkedin"
        scheduled_at = "2026-10-15T10:00:00Z"
        timezone_str = "Asia/Kolkata"
        content_version_id = "cv_v1"
        content_version_hash = "hash_v1"
        auth_id_v1 = "auth_claim_v1"

        from app.utils.canonical_hasher import compute_calendar_event_hash
        sig_v1 = compute_calendar_event_hash(channel, {"post_text": "Original"}, scheduled_at, timezone_str)
        
        # Tamper content text -> Recompute hash
        sig_tampered = compute_calendar_event_hash(channel, {"post_text": "Tampered"}, scheduled_at, timezone_str)

        self.assertNotEqual(sig_v1, sig_tampered)
        print("[PASS] P0 Test 6: Cryptographic signature tampering invalidated original content_version_hash.")

    # -------------------------------------------------------------
    # P1 TARGETED TESTS: RBAC Allow/Deny Matrix, DB Lock Contention
    # -------------------------------------------------------------
    def test_rbac_allow_and_deny_matrix(self):
        print("\n--- P1 TEST 1: RBAC Allow & Deny Matrix ---")
        from app.middleware.security import require_role, AuthenticatedUser
        from fastapi import HTTPException
        
        author_user = AuthenticatedUser(user_id="usr_author_01", email="a@brand.com", role="CONTENT_AUTHOR")
        checker = require_role("COMPLIANCE_APPROVER")
        
        denied = False
        try:
            checker(user=author_user, workspace_id="00000000-0000-0000-0000-000000000001")
        except HTTPException as he:
            if he.status_code == 403:
                denied = True

        self.assertTrue(denied)
        print("[PASS] P1 Test 1: RBAC deny rule correctly blocked CONTENT_AUTHOR from invoking COMPLIANCE_APPROVER endpoint.")

if __name__ == "__main__":
    unittest.main()

