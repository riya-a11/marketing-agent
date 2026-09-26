from fastapi.testclient import TestClient
from app.main import app
from app.services.security.auth_service import hash_password, verify_password, create_jwt_token, decode_jwt_token, revoke_token
from app.services.security.grant_jwt import create_grant_jwt, verify_and_consume_grant_jwt as verify_grant_jwt

client = TestClient(app)

def test_password_hashing_pbkdf2():
    password = "SuperSecurePassword123!"
    hashed = hash_password(password)
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_lifecycle_and_revocation():
    payload = {"sub": "usr_test_01", "role": "CREATOR", "email": "creator@brand.com"}
    token = create_jwt_token(payload, expires_in_seconds=300)
    
    claims = decode_jwt_token(token)
    assert claims["sub"] == "usr_test_01"
    assert claims["role"] == "CREATOR"
    
    jti = claims["jti"]
    revoke_token(jti)
    
    revoked = False
    try:
        decode_jwt_token(token)
    except ValueError as e:
        if "revoked" in str(e):
            revoked = True
    assert revoked is True

def test_auth_signup_login_logout_cookies():
    # 1. Signup
    signup_payload = {
        "email": "test_user_001@marketing-os.net",
        "password": "Password123!",
        "role": "COMPLIANCE_APPROVER"
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201
    assert "access_token" in signup_res.cookies
    assert "refresh_token" in signup_res.cookies
    
    # 2. Login
    login_payload = {
        "email": "test_user_001@marketing-os.net",
        "password": "Password123!"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    assert login_res.json()["message"] == "Login successful."
    assert "access_token" in login_res.cookies

    # 3. Get /me
    me_res = client.get("/api/v1/auth/me", cookies=login_res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "test_user_001@marketing-os.net"
    assert me_res.json()["role"] == "COMPLIANCE_APPROVER"

    # 4. Logout
    logout_res = client.post("/api/v1/auth/logout", cookies=login_res.cookies)
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Logged out successfully and session invalidated."

def test_password_recovery_workflow():
    # Forgot Password
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": "admin@marketing-os.net"})
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json().get("reset_token")
    assert reset_token is not None

    # Reset Password
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "reset_token": reset_token,
        "new_password": "NewAdminPassword123!"
    })
    assert reset_res.status_code == 200
    assert "Password updated successfully" in reset_res.json()["message"]

    # Login with new password
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@marketing-os.net",
        "password": "NewAdminPassword123!"
    })
    assert login_res.status_code == 200

def test_backend_authorization_bypass_prevention():
    """
    Verifies that direct API calls to approval endpoints by unauthorized users or roles
    are strictly rejected on the backend with 403 FORBIDDEN.
    """
    # 1. Login as CREATOR (non-compliance officer)
    signup_payload = {
        "email": "creator_only@marketing-os.net",
        "password": "Password123!",
        "role": "CREATOR"
    }
    client.post("/api/v1/auth/signup", json=signup_payload)
    login_res = client.post("/api/v1/auth/login", json={
        "email": "creator_only@marketing-os.net",
        "password": "Password123!"
    })
    creator_cookies = login_res.cookies

    # Direct unauthorized approve request bypassing UI
    approve_res = client.post(
        "/api/v1/calendar/events/ev_100/approve",
        json={"content_version": "v1.0", "content_hash": "hash_123"},
        cookies=creator_cookies,
        headers={"X-Workspace-ID": "00000000-0000-0000-0000-000000000001"}
    )
    # Backend strictly rejects with 403 Forbidden!
    assert approve_res.status_code == 403
    assert "FORBIDDEN" in approve_res.json()["detail"]

def test_dual_actor_grant_jwt_and_author_isolation():
    actor1_id = "usr_compliance_officer_01"
    actor2_id = "usr_legal_officer_02"
    author_id = "usr_author_creator_99"
    workspace_id = "00000000-0000-0000-0000-000000000001"
    version_id = "00000000-0000-0000-0000-000000000099"

    # Valid Grant Token
    grant_token = create_grant_jwt(actor2_id, workspace_id, version_id)
    verified = verify_grant_jwt(grant_token, actor1_id, workspace_id, version_id, author_id)
    assert verified["actor2_id"] == actor2_id

    # Distinctness Failure Test (actor1 == actor2)
    grant_token2 = create_grant_jwt(actor2_id, workspace_id, version_id)
    distinctness_failed = False
    try:
        verify_grant_jwt(grant_token2, actor2_id, workspace_id, version_id, author_id)
    except Exception as e:
        if "distinct" in str(e):
            distinctness_failed = True
    assert distinctness_failed is True

    # Author Isolation Test (approver == author)
    grant_token3 = create_grant_jwt(author_id, workspace_id, version_id)
    author_isolation_failed = False
    try:
        verify_grant_jwt(grant_token3, actor1_id, workspace_id, version_id, author_id)
    except Exception as e:
        if "Author cannot act" in str(e):
            author_isolation_failed = True
    assert author_isolation_failed is True
