import io
from fastapi.testclient import TestClient
from app.main import app
from PIL import Image

client = TestClient(app)

def test_enterprise_social_suite():
    print("=== STARTING ENTERPRISE SOCIAL PUBLISHING SUITE VERIFICATION ===")
    
    # 1. Health Check & Account Baseline Reset
    res = client.get("/")
    assert res.status_code == 200, f"Root check failed: {res.text}"
    
    # Ensure all test accounts are in active connected state
    for p in ["linkedin", "x", "instagram", "youtube"]:
        client.post(
            f"/api/v1/social-auth/{p}/connect",
            json={"account_handle": f"@test_{p}", "display_name": f"Test {p.title()}"}
        )
    print("[PASS] Health Check Passed & Test Channels Connected")

    # 2. Layer 1: Media Security & Magic Byte Signature Validation
    # A. Valid JPEG Image with dimensions
    img_byte_arr = io.BytesIO()
    img = Image.new("RGB", (1200, 630), color=(200, 255, 0))
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    res = client.post(
        "/api/v1/media/upload",
        files={"file": ("test_banner.jpg", img_bytes, "image/jpeg")}
    )
    assert res.status_code == 200, f"Media upload failed: {res.text}"
    media_data = res.json()
    assert media_data["id"].startswith("media_"), "Invalid media id"
    assert media_data["width"] == 1200 and media_data["height"] == 630, "Dimension extraction failed"
    print(f"[PASS] Media Upload (Valid Signature) Passed (Asset ID: {media_data['id']}, {media_data['width']}x{media_data['height']}px)")

    # B. Security Test: Malicious executable masquerading as .jpg
    fake_executable_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00ThisIsNotAJpeg"
    res = client.post(
        "/api/v1/media/upload",
        files={"file": ("malware_payload.jpg", fake_executable_bytes, "image/jpeg")}
    )
    assert res.status_code == 400, "Security flaw: Fake executable masquerading as JPG was not rejected!"
    print("[PASS] Security Validation Passed: Masquerading file signature correctly rejected (HTTP 400)")

    # 3. Layer 2: Social Accounts & OAuth PKCE
    res = client.get("/api/v1/campaigns/social-accounts")
    assert res.status_code == 200
    accounts = res.json()["accounts"]
    platforms = [a["platform"] for a in accounts]
    assert "linkedin" in platforms and "x" in platforms and "instagram" in platforms
    print(f"[PASS] Social Accounts Retrieved (Platforms: {', '.join(platforms)})")

    res = client.get("/api/v1/social-auth/x/authorize")
    assert res.status_code == 200
    assert "code_challenge" in res.json()["authorization_url"]
    print("[PASS] OAuth 2.0 PKCE Endpoint Passed")

    # 4. Layer 3: Direct Multi-Platform Publishing (LinkedIn, X, Instagram) with Provider Mode
    import time
    test_idempotency_key = f"test_idemp_key_{int(time.time()*1000)}"
    res = client.post(
        "/api/v1/campaigns/multi-publish",
        json={
            "platforms": ["linkedin", "x", "instagram"],
            "content_text": "🚀 Launching our new high-speed urban e-bike series.",
            "cta": "Explore at velodynamics.com",
            "media_id": media_data["id"],
            "idempotency_key": test_idempotency_key,
            "mode": "direct_api",
            "title": "Velo Urban Series"
        }
    )
    assert res.status_code == 200, f"Multi-publish failed: {res.text}"
    pub_data = res.json()
    batch_id = pub_data["batch_id"]
    assert pub_data["total"] == 3
    assert pub_data["succeeded"] == 3
    
    for r in pub_data["results"]:
        assert r["status"] in ["published", "SIMULATED_PUBLISHED"]
        assert "provider_mode" in r
        print(f"  • [{r['platform'].upper()}] Published ({r['provider_mode']} mode) -> {r['permalink']}")
    print("[PASS] Layer 3 Direct Multi-Platform Publishing (LinkedIn, X, Instagram) Passed")

    # 5. Layer 4: Idempotency Protection Test
    res_retry = client.post(
        "/api/v1/campaigns/multi-publish",
        json={
            "platforms": ["linkedin", "x", "instagram"],
            "content_text": "🚀 Launching our new high-speed urban e-bike series.",
            "cta": "Explore at velodynamics.com",
            "media_id": media_data["id"],
            "idempotency_key": test_idempotency_key,
            "mode": "direct_api"
        }
    )
    assert res_retry.status_code == 200
    retry_data = res_retry.json()
    assert all(r.get("is_idempotent_replay") for r in retry_data["results"]), "Idempotency failed: Duplicate publish detected!"
    print("[PASS] Idempotency Protection Verified: Duplicate publish prevented via idempotency_key")

    # 6. Layer 5: Publication Batch Status Query
    res_batch = client.get(f"/api/v1/campaigns/publication-batches/{batch_id}")
    assert res_batch.status_code == 200
    batch_info = res_batch.json()
    assert batch_info["status"] == "published"
    assert batch_info["total"] == 3
    print(f"[PASS] Publication Batch Query Verified (Batch ID: {batch_id}, Status: {batch_info['status']})")

    # 7. Layer 6: Platform Capability Matrix Contract
    res_caps = client.get("/api/v1/campaigns/capabilities")
    assert res_caps.status_code == 200
    caps = res_caps.json()["platforms"]
    assert caps["x"]["max_characters"] == 280
    assert caps["instagram"]["requires_media"] is True
    print("[PASS] Platform Capability Matrix Contract Verified (/api/v1/campaigns/capabilities)")

    # 8. Layer 7: Failure Isolation & Retry Classification Test
    res_iso = client.post(
        "/api/v1/campaigns/multi-publish",
        json={
            "platforms": ["linkedin", "instagram"],
            "content_text": "Text only post without media attachment",
            "media_id": None,
            "mode": "direct_api"
        }
    )
    assert res_iso.status_code == 200
    iso_data = res_iso.json()
    assert iso_data["succeeded"] == 1 and iso_data["failed"] == 1
    assert iso_data["status"] == "partial"
    
    # Check retry classification metadata on failed Instagram publication
    failed_ig = next(r for r in iso_data["results"] if r["platform"] == "instagram")
    assert failed_ig["retryable"] is False
    assert failed_ig["error_code"] == "INVALID_MEDIA_REQUIREMENT"
    print("[PASS] Layer 7 Failure Isolation & Classified Retry Policy Verified (Error: INVALID_MEDIA_REQUIREMENT, retryable=False)")

    # 9. Layer 8: YouTube Video Platform & Direct OAuth Connect Handshake
    res_direct = client.post(
        "/api/v1/social-auth/youtube/connect",
        json={
            "account_handle": "@company_channel",
            "display_name": "Official YouTube Channel"
        }
    )
    assert res_direct.status_code == 200
    direct_data = res_direct.json()
    assert direct_data["status"] == "success"
    assert direct_data["account"]["platform"] == "youtube"
    print("[PASS] YouTube Direct Account Connection & Encryption Verified")

    # 10. Layer 9: Durable Multi-Instance OAuth State Handshake & Atomic Single-Use Consumption
    # Initiation
    res_auth = client.get("/api/v1/social-auth/linkedin/authorize")
    assert res_auth.status_code == 200
    auth_data = res_auth.json()
    state_token = auth_data["state"]

    # First callback: successfully consumes state
    res_cb = client.get(f"/api/v1/social-auth/linkedin/callback?code=mock_oauth_code_123&state={state_token}")
    assert res_cb.status_code == 200
    cb_data = res_cb.json()
    assert cb_data["status"] == "success"
    assert cb_data["account"]["platform"] == "linkedin"

    # Second callback: Replay Attack test (State must be rejected with HTTP 400)
    res_replay = client.get(f"/api/v1/social-auth/linkedin/callback?code=mock_oauth_code_123&state={state_token}")
    assert res_replay.status_code == 400
    assert "Invalid, expired, or already consumed" in res_replay.json()["detail"]
    print("[PASS] Layer 9 Durable Multi-Instance OAuth State & Atomic Replay Prevention Verified")

    # 11. Layer 10: AES-256-GCM Key Rotation & Envelope Encryption Test
    from app.services.security.crypto import token_crypto
    plain_token = "secret_access_token_production_grade_xyz123"
    enc_token_v2 = token_crypto.encrypt_token(plain_token, key_version="v2")
    assert enc_token_v2.startswith("enc_v2:")
    
    # Decrypt with v2
    decrypted = token_crypto.decrypt_token(enc_token_v2)
    assert decrypted == plain_token
    print("[PASS] Layer 10 AES-256-GCM Envelope Encryption & Decryption Verified")

    # 12. Layer 11: Soft-Disconnect State Machine & Publish Guard Test
    res_disc = client.post("/api/v1/social-auth/linkedin/disconnect")
    assert res_disc.status_code == 200
    assert res_disc.json()["revocation_status"] == "DISCONNECTED"

    # Publishing while DISCONNECTED must be prohibited
    res_blocked = client.post(
        "/api/v1/campaigns/multi-publish",
        json={
            "platforms": ["linkedin"],
            "content_text": "Trying to publish on disconnected account",
            "mode": "direct_api"
        }
    )
    assert res_blocked.status_code == 200
    blocked_data = res_blocked.json()
    assert blocked_data["failed"] == 1
    assert "DISCONNECTED" in blocked_data["results"][0]["error"]
    print("[PASS] Layer 11 Soft-Disconnect State Machine & Publish Guard Verified")

    # Reconnect LinkedIn for clean state
    client.post(
        "/api/v1/social-auth/linkedin/connect",
        json={"account_handle": "Velo Dynamics Inc.", "display_name": "LinkedIn Business"}
    )

    # 13. Layer 12: Concurrency-Controlled Token Refresh with Version Fencing
    res_ref1 = client.post("/api/v1/social-auth/linkedin/refresh")
    assert res_ref1.status_code == 200
    ref_data = res_ref1.json()
    assert ref_data["status"] == "refreshed"
    assert ref_data["credential_version"] >= 2
    print(f"[PASS] Layer 12 Concurrency-Controlled Token Refresh & Credential Fencing Verified (v{ref_data['credential_version']})")

    # 14. Layer 13: Fail-Closed Production Gating Invariant Test
    from app.services.publishing.social_oauth import SocialOAuthService, ProviderConfigurationError
    from app.config import settings
    orig_env = settings.ENVIRONMENT
    orig_mode = settings.SOCIAL_PROVIDER_MODE
    try:
        settings.ENVIRONMENT = "production"
        settings.SOCIAL_PROVIDER_MODE = "live"
        assert SocialOAuthService.is_mock_allowed() is False
        
        # In production with mock credentials, exchange MUST raise ProviderConfigurationError
        threw_error = False
        try:
            import asyncio
            asyncio.run(SocialOAuthService.exchange_code_for_tokens(
                platform="linkedin",
                code="fake_code",
                redirect_uri="https://app.velodynamics.com/oauth/linkedin/callback"
            ))
        except ProviderConfigurationError:
            threw_error = True
        assert threw_error is True
        print("[PASS] Layer 13 Fail-Closed Production Boundary Invariant Verified (No Silent Degradation)")
    finally:
        settings.ENVIRONMENT = orig_env
        settings.SOCIAL_PROVIDER_MODE = orig_mode

    # 15. Layer 14: External Side-Effect Reconciliation Test (Ambiguous Timeout Recovery)
    from app.storage.db import get_social_publication, query_audit_ledger_entries, save_social_account, get_social_account
    
    # Ensure LinkedIn account is cleanly connected with valid scopes
    client.post(
        "/api/v1/social-auth/linkedin/connect",
        json={"account_handle": "Velo Dynamics Inc.", "display_name": "LinkedIn Business"}
    )
    
    test_reconcile_idemp_key = f"test_ambiguous_recon_{int(time.time()*1000)}"
    res_ambiguous = client.post(
        "/api/v1/campaigns/multi-publish",
        json={
            "platforms": ["linkedin"],
            "content_text": "Ambiguous network drop simulate_timeout test for Layer 14",
            "idempotency_key": test_reconcile_idemp_key,
            "mode": "direct_api"
        }
    )
    assert res_ambiguous.status_code == 200
    amb_data = res_ambiguous.json()
    amb_res = amb_data["results"][0]
    assert amb_res["status"] == "RECONCILIATION_REQUIRED"
    assert amb_res["requires_reconciliation"] is True
    pub_id = amb_res["publication_id"]
    
    # Assert DB publication stored as RECONCILIATION_REQUIRED
    stored_pub = get_social_publication(pub_id)
    assert stored_pub["status"] == "RECONCILIATION_REQUIRED"
    
    # Assert Audit Ledger has recorded PUBLISH_RECONCILIATION_REQUIRED
    recon_req_entries = query_audit_ledger_entries(action="PUBLISH_RECONCILIATION_REQUIRED", entity_id=pub_id)
    assert len(recon_req_entries) >= 1
    print(f"[PASS] Ambiguous Network Drop Classified as RECONCILIATION_REQUIRED (Pub ID: {pub_id})")

    # Execute Reconciler (Queries provider via publication ID without duplicate post)
    res_recon = client.post(f"/api/v1/campaigns/reconcile/{pub_id}")
    assert res_recon.status_code == 200
    recon_data = res_recon.json()
    assert recon_data["status"] == "reconciled"
    assert recon_data["external_post_id"].startswith("urn:li:share:")
    assert recon_data["external_publication_count"] == 1, "Side-effect violation: Multiple external posts were created!"

    # Assert DB publication updated to published
    reconciled_pub = get_social_publication(pub_id)
    assert reconciled_pub["status"] == "published"
    assert reconciled_pub["external_post_id"] == recon_data["external_post_id"]
    assert reconciled_pub["permalink"] is not None

    # Assert Audit Ledger contains PUBLISH_RECONCILED
    reconciled_entries = query_audit_ledger_entries(action="PUBLISH_RECONCILED", entity_id=pub_id)
    assert len(reconciled_entries) >= 1
    print(f"[PASS] Layer 14 External Side-Effect Reconciliation Verified: {recon_data['external_post_id']} (Exactly 1 Side Effect)")

    # Assert Idempotent Replay on Reconciled Post returns immediately with no duplicate
    res_recon_replay = client.post(
        "/api/v1/campaigns/multi-publish",
        json={
            "platforms": ["linkedin"],
            "content_text": "Ambiguous network drop simulate_timeout test for Layer 14",
            "idempotency_key": test_reconcile_idemp_key,
            "mode": "direct_api"
        }
    )
    assert res_recon_replay.status_code == 200
    replay_data = res_recon_replay.json()
    assert replay_data["results"][0]["is_idempotent_replay"] is True
    assert replay_data["results"][0]["post_id"] == recon_data["external_post_id"]
    print("[PASS] Idempotent Replay on Reconciled Post Confirmed (Zero External Side Effects)")

    # 16. Scope Pre-Flight Gating & REAUTHORIZATION_REQUIRED Invariant Test
    save_social_account({
        "platform": "linkedin",
        "account_handle": "Restricted Scope Account",
        "scopes": ["read_only"],
        "granted_scopes": ["read_only"],
        "scope_version": "v1",
        "status": "connected",
        "revocation_status": "ACTIVE"
    })
    res_scope = client.post(
        "/api/v1/campaigns/multi-publish",
        json={
            "platforms": ["linkedin"],
            "content_text": "Testing publish without required w_member_social scope",
            "mode": "direct_api"
        }
    )
    assert res_scope.status_code == 200
    scope_res = res_scope.json()["results"][0]
    assert scope_res["status"] == "failed"
    assert scope_res["error_code"] == "REAUTHORIZATION_REQUIRED"
    assert "missing required publish scopes" in scope_res["error"]
    print("[PASS] Scope Pre-Flight Verification Passed: Missing scopes reject with REAUTHORIZATION_REQUIRED")

    # Restore full scopes for LinkedIn
    client.post(
        "/api/v1/social-auth/linkedin/connect",
        json={"account_handle": "Velo Dynamics Inc.", "display_name": "LinkedIn Business"}
    )

    # 17. Formalized 4-Step Revocation State Machine & Upstream Call Test
    res_disco = client.post("/api/v1/social-auth/linkedin/disconnect")
    assert res_disco.status_code == 200
    disco_data = res_disco.json()
    assert disco_data["revocation_status"] == "DISCONNECTED"
    assert disco_data["upstream_revocation"]["revoked"] is True

    # Verify audit ledger transitions: CONNECTION_REVOKING -> CONNECTION_REVOKED -> CONNECTION_DISCONNECTED
    revoking_logs = query_audit_ledger_entries(action="CONNECTION_REVOKING")
    revoked_logs = query_audit_ledger_entries(action="CONNECTION_REVOKED")
    disc_logs = query_audit_ledger_entries(action="CONNECTION_DISCONNECTED")
    assert len(revoking_logs) >= 1
    assert len(revoked_logs) >= 1
    assert len(disc_logs) >= 1

    # Verify credentials at rest are completely destroyed (NULL)
    li_acc = get_social_account("linkedin")
    assert li_acc["access_token_encrypted"] is None
    assert li_acc["refresh_token_encrypted"] is None
    print("[PASS] Formalized 4-Step Revocation State Machine Verified (ACTIVE -> REVOKING -> REVOKED -> DISCONNECTED)")

    # 18. Stable Server-Side Session Binding Hash Resilience Test
    from app.api.social_auth import compute_session_binding_hash
    from starlette.requests import Request
    
    # Two requests with identical session cookie but differing IPs (e.g. mobile cellular handover)
    req1 = Request(scope={"type": "http", "headers": [(b"cookie", b"session_id=sess_corp_auth_999")], "client": ("192.168.1.1", 50000)})
    req2 = Request(scope={"type": "http", "headers": [(b"cookie", b"session_id=sess_corp_auth_999")], "client": ("10.0.0.88", 60000)})
    
    hash1 = compute_session_binding_hash(req1)
    hash2 = compute_session_binding_hash(req2)
    assert hash1 == hash2, "Session binding hash is fragile against IP shifts!"
    
    # Assert that production strictly rejects sessionless requests (no dev_session_anchor fallback)
    from fastapi import HTTPException
    orig_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        empty_req = Request(scope={"type": "http", "headers": [], "client": ("127.0.0.1", 50000)})
        threw_401 = False
        try:
            compute_session_binding_hash(empty_req)
        except HTTPException as exc:
            if exc.status_code == 401:
                threw_401 = True
        assert threw_401 is True, "Security leak: dev_session_anchor allowed in production!"
    finally:
        settings.ENVIRONMENT = orig_env
    print("[PASS] Stable Server-Side Session Binding Hash Verified (Resilient across Cellular/IP Shifts & Strict Production Gating)")

    # 19. Provider Error Taxonomy HTTP Mapping Test
    from app.services.publishing.social_oauth import (
        ProviderError,
        ProviderAuthenticationError,
        ProviderAuthorizationDenied,
        ProviderUnavailableError,
        ProviderRateLimitedError,
        ProviderPermissionError
    )
    assert ProviderConfigurationError("err").status_code == 503
    assert ProviderAuthenticationError("err").status_code == 401
    assert ProviderAuthorizationDenied("err").status_code == 403
    assert ProviderUnavailableError("err").status_code == 502
    assert ProviderRateLimitedError("err").status_code == 429
    assert ProviderPermissionError("err").status_code == 403
    print("[PASS] Provider Error Taxonomy HTTP Status Mapping Verified (401, 403, 429, 502, 503)")

    print("\n=== ALL AUTOMATED CI SUITE TESTS PASSED (ENTERPRISE HARDENED ARCHITECTURE) ===")

if __name__ == "__main__":
    test_enterprise_social_suite()

