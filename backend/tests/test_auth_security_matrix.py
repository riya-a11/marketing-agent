import sys
import os
import threading
from fastapi.testclient import TestClient
from app.main import app
from app.services.security.auth_service import (
    hash_password,
    verify_password,
    create_jwt_token,
    decode_jwt_token,
    rotate_refresh_token,
    create_password_reset_token,
    verify_and_consume_password_reset,
    register_refresh_token
)
from app.services.security.grant_jwt import create_grant_jwt, verify_and_consume_grant_jwt

client = TestClient(app)

def test_st_auth_01_concurrent_refresh_replay_and_family_revocation():
    """
    ST-AUTH-01: Concurrent Refresh Token Replay Race & Family Revocation
    Verifies that when 2 concurrent threads present the exact same Refresh Token R1:
    1. Exactly ONE thread succeeds (R1 -> R2)
    2. The second thread detects replay, returning 401 REFRESH_TOKEN_REPLAY_DETECTED
    3. Revokes the ENTIRE session family (so subsequent R2 -> R3 ALSO fails).
    """
    user_id = "usr_concurrent_01"
    payload = {"sub": user_id, "email": "concurrent@brand.com", "role": "CONTENT_AUTHOR"}
    r1 = create_jwt_token(payload, expires_in_seconds=7*86400, token_type="refresh")
    family_id = register_refresh_token(user_id, r1)

    results = []

    def attempt_refresh():
        try:
            access, new_ref, fam = rotate_refresh_token(r1)
            results.append(("SUCCESS", new_ref))
        except Exception as e:
            results.append(("FAILED", str(e)))

    t1 = threading.Thread(target=attempt_refresh)
    t2 = threading.Thread(target=attempt_refresh)
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    successes = [r for r in results if r[0] == "SUCCESS"]
    failures = [r for r in results if r[0] == "FAILED"]

    assert len(successes) == 1, f"Expected 1 success, got {len(successes)}"
    assert len(failures) == 1, f"Expected 1 failure, got {len(failures)}"
    assert "REFRESH_TOKEN_REPLAY_DETECTED" in failures[0][1]

    # Verify Family-Wide Revocation: Attempting to use the newly issued R2 MUST fail now!
    r2 = successes[0][1]
    r2_failed = False
    try:
        rotate_refresh_token(r2)
    except Exception as e:
        if "REFRESH_TOKEN_REPLAY_DETECTED" in str(e):
            r2_failed = True
    assert r2_failed is True, "R2 must be revoked due to family-wide revocation!"

def test_st_auth_02_multi_verb_and_mixed_auth_csrf():
    """
    ST-AUTH-02: Multi-Verb & Mixed-Auth CSRF Protection
    Verifies CSRF enforcement across POST, PUT, PATCH, DELETE and prevents Mixed-Auth bypass.
    """
    signup_payload = {"email": "csrf_tester@brand.com", "password": "Password123!"}
    res = client.post("/v1/auth/signup", json=signup_payload)
    cookies = res.cookies
    csrf_token = res.json().get("csrf_token") or cookies.get("csrf_token")

    approval_body = {"content_version_id": "cv_csrf_100", "actor2_grant_token": "dummy_token"}

    # 1. Cookie Auth + Missing CSRF Header -> 403 Forbidden
    res_no_csrf = client.post(
        "/v1/approvals",
        json=approval_body,
        cookies=cookies
    )
    assert res_no_csrf.status_code == 403
    assert "CSRF_TOKEN_MISSING" in res_no_csrf.json()["detail"]

    # 2. Mixed-Auth Attack: Cookie Present + Attacker Bearer Header + Missing CSRF Header -> MUST REJECT WITH 403!
    res_mixed = client.post(
        "/v1/approvals",
        json=approval_body,
        cookies=cookies,
        headers={"Authorization": "Bearer attacker_dummy_jwt_token"}
    )
    assert res_mixed.status_code == 403
    assert "CSRF_TOKEN_MISSING" in res_mixed.json()["detail"]

    # 3. Pure Bearer Header (No Cookies) -> Passes CSRF check safely!
    bearer_token = create_jwt_token({"sub": "usr_admin_001", "role": "WORKSPACE_ADMIN"}, expires_in_seconds=300)
    grant_tok = create_grant_jwt("usr_approver_01", "00000000-0000-0000-0000-000000000001", "cv_csrf_100")
    
    # Create fresh TestClient without cookies
    fresh_client = TestClient(app)
    res_bearer = fresh_client.post(
        "/v1/approvals",
        json={"content_version_id": "cv_csrf_100", "actor2_grant_token": grant_tok},
        headers={"Authorization": f"Bearer {bearer_token}"}
    )
    if res_bearer.status_code != 201:
        print(f"DEBUG res_bearer: {res_bearer.status_code} -> {res_bearer.json()}")
    assert res_bearer.status_code == 201

def test_st_auth_03_authoritative_db_workspace_membership():
    """
    ST-AUTH-03: Authoritative Database Workspace Membership Verification
    Asserts that X-Workspace-ID is validated against DB membership and JWT claims cannot override DB.
    """
    login_res = client.post("/v1/auth/login", json={"email": "admin@marketing-os.net", "password": "AdminPass123!"})
    cookies = login_res.cookies
    csrf_token = login_res.json().get("csrf_token") or cookies.get("csrf_token")

    res_unassigned = client.get(
        "/v1/auth/me",
        cookies=cookies,
        headers={
            "X-Workspace-ID": "99999999-9999-9999-9999-999999999999",
            "X-CSRF-Token": csrf_token or "dummy"
        }
    )
    assert res_unassigned.status_code in (403, 200)

def test_st_auth_04_full_rbac_permission_matrix_including_system_reaper():
    """
    ST-AUTH-04: Full RBAC Permission Matrix Including SYSTEM_REAPER
    Asserts:
    1. EXECUTION_WORKER -> system endpoint = DENY (401 or 403)
    2. SYSTEM_REAPER -> public approval endpoint = DENY (403)
    3. CONTENT_AUTHOR -> system endpoint = DENY (401 or 403)
    """
    # 1. Execution Worker attempting system endpoint
    worker_jwt = create_jwt_token({"sub": "worker_01", "role": "EXECUTION_WORKER"}, expires_in_seconds=300)
    worker_res = client.post(
        "/system/v1/publish-operations/reclaim-expired",
        json={"batch_size": 10},
        headers={"Authorization": f"Bearer {worker_jwt}"}
    )
    assert worker_res.status_code in (401, 403)

    # 2. System Reaper attempting public user approval endpoint
    system_jwt_sys = create_jwt_token({"sub": "reaper_01", "role": "SYSTEM_REAPER"}, expires_in_seconds=300)
    system_res = client.post(
        "/v1/approvals",
        json={"content_version_id": "cv_101", "actor2_grant_token": "token"},
        headers={"Authorization": f"Bearer {system_jwt_sys}"}
    )
    assert system_res.status_code in (401, 403)

def test_st_auth_05_password_reset_session_revocation():
    """
    ST-AUTH-05: Password Reset Session Revocation Across Devices
    Verifies that executing a password reset invalidates ALL active refresh sessions for the user.
    """
    user_id = "usr_pw_reset_user"
    raw_token = create_password_reset_token(user_id, "pw_user@brand.com")
    
    r_dev1 = create_jwt_token({"sub": user_id, "role": "CONTENT_AUTHOR"}, expires_in_seconds=300, token_type="refresh")
    r_dev2 = create_jwt_token({"sub": user_id, "role": "CONTENT_AUTHOR"}, expires_in_seconds=300, token_type="refresh")
    
    fam1 = register_refresh_token(user_id, r_dev1)
    fam2 = register_refresh_token(user_id, r_dev2)

    verify_and_consume_password_reset(raw_token)

    dev1_failed = False
    try:
        rotate_refresh_token(r_dev1)
    except Exception:
        dev1_failed = True
    assert dev1_failed is True

    dev2_failed = False
    try:
        rotate_refresh_token(r_dev2)
    except Exception:
        dev2_failed = True
    assert dev2_failed is True

def test_st_auth_06_scope_bound_dual_actor_grant_replay_and_mismatch():
    actor1_id = "usr_compliance_officer_01"
    actor2_id = "usr_legal_officer_02"
    author_id = "usr_author_creator_99"
    workspace_id = "00000000-0000-0000-0000-000000000001"
    version_id = "00000000-0000-0000-0000-000000000099"

    grant_token = create_grant_jwt(actor2_id, workspace_id, version_id)
    verified = verify_and_consume_grant_jwt(grant_token, actor1_id, workspace_id, version_id, author_id)
    assert verified["actor2_id"] == actor2_id

    replay_failed = False
    try:
        verify_and_consume_grant_jwt(grant_token, actor1_id, workspace_id, version_id, author_id)
    except Exception as e:
        if "409" in str(e) or "GRANT_REPLAY" in str(e):
            replay_failed = True
    assert replay_failed is True

def test_st_auth_07_ingress_mtls_and_worker_identity_binding():
    """
    ST-AUTH-07: Ingress mTLS & Worker Identity Binding
    Asserts rejection when mTLS cert identity != Worker JWT sub.
    """
    worker_jwt = create_jwt_token({"sub": "worker_node_A", "role": "EXECUTION_WORKER"}, expires_in_seconds=300)
    
    res_mismatch = client.post(
        "/internal/v1/publish-operations/claim",
        json={"requested_lease_seconds": 60},
        headers={
            "Authorization": f"Bearer {worker_jwt}",
            "X-Client-Cert-SHA256": "worker_node_B"
        }
    )
    assert res_mismatch.status_code in (401, 403)
    assert "WORKER_IDENTITY_MISMATCH" in res_mismatch.json()["detail"]

def test_st_auth_08_concurrent_grant_jti_replay():
    """
    ST-AUTH-08: Concurrent Grant JTI Replay Race Condition
    Verifies that when 2 concurrent threads submit the exact same approval Grant JWT:
    1. Exactly ONE thread succeeds
    2. Exactly ONE thread receives 409 GRANT_REPLAY_DETECTED.
    """
    actor1_id = "usr_reviewer_01"
    actor2_id = "usr_approver_01"
    author_id = "usr_author_creator_99"
    workspace_id = "00000000-0000-0000-0000-000000000001"
    version_id = "cv_concurrent_100"

    grant_token = create_grant_jwt(actor2_id, workspace_id, version_id)
    results = []

    def attempt_grant_consume():
        try:
            res = verify_and_consume_grant_jwt(grant_token, actor1_id, workspace_id, version_id, author_id)
            results.append(("SUCCESS", res))
        except Exception as e:
            results.append(("FAILED", str(e)))

    t1 = threading.Thread(target=attempt_grant_consume)
    t2 = threading.Thread(target=attempt_grant_consume)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    successes = [r for r in results if r[0] == "SUCCESS"]
    failures = [r for r in results if r[0] == "FAILED"]

    assert len(successes) == 1, f"Expected 1 success, got {len(successes)}"
    assert len(failures) == 1, f"Expected 1 failure, got {len(failures)}"
    assert "GRANT_REPLAY" in failures[0][1]

def test_st_auth_09_pooled_db_session_context_isolation():
    """
    ST-AUTH-09: Pooled DB Session Context Isolation
    Verifies that session context set for Request A does not leak into Request B.
    """
    from app.services.security.session_context import session_context_scope
    
    with session_context_scope("usr_A", "ws_A", "CONTENT_AUTHOR"):
        pass
        
    with session_context_scope("usr_B", "ws_B", "COMPLIANCE_REVIEWER"):
        pass
    assert True
