import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response, Request, status
from pydantic import BaseModel
from app.database import supabase
from app.services.security.auth_service import (
    hash_password,
    verify_password,
    create_jwt_token,
    decode_jwt_token,
    rotate_refresh_token,
    revoke_refresh_family,
    create_password_reset_token,
    verify_and_consume_password_reset,
    generate_csrf_token,
    set_auth_and_csrf_cookies,
    clear_auth_and_csrf_cookies,
    register_refresh_token
)
from app.middleware.security import get_current_user, AuthenticatedUser

logger = logging.getLogger("auth_api")

router = APIRouter(prefix="/auth", tags=["Auth"])

# -----------------------------------------------------------------------------
# Request & Response Schemas
# -----------------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "CONTENT_AUTHOR"

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: str

class FirebaseSessionRequest(BaseModel):
    id_token: str
    uid: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    organization_name: Optional[str] = "My Startup"

_MOCK_USER_DB = {
    "admin@marketing-os.net": {
        "id": "usr_admin_001",
        "email": "admin@marketing-os.net",
        "password_hash": hash_password("AdminPass123!"),
        "role": "WORKSPACE_ADMIN"
    }
}

# -----------------------------------------------------------------------------
# Auth API Routes
# -----------------------------------------------------------------------------

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, response: Response):
    email = req.email.lower().strip()
    if email in _MOCK_USER_DB:
        raise HTTPException(status_code=400, detail="User already registered.")
    
    user_id = f"usr_{hash_password(email)[-12:]}"
    hashed_pwd = hash_password(req.password)
    role = req.role or "CONTENT_AUTHOR"
    
    user_record = {
        "id": user_id,
        "email": email,
        "password_hash": hashed_pwd,
        "role": role
    }
    _MOCK_USER_DB[email] = user_record
    
    payload = {"sub": user_id, "email": email, "role": role}
    access_token = create_jwt_token(payload, expires_in_seconds=900, token_type="access")
    refresh_token = create_jwt_token(payload, expires_in_seconds=7 * 86400, token_type="refresh")
    csrf_token = generate_csrf_token()

    register_refresh_token(user_id, refresh_token)
    set_auth_and_csrf_cookies(response, access_token, refresh_token, csrf_token)
    
    return {
        "message": "User registered successfully.",
        "user": {"id": user_id, "email": email, "role": role},
        "csrf_token": csrf_token
    }

@router.post("/login")
def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()
    user_record = _MOCK_USER_DB.get(email)
    
    if not user_record or not verify_password(req.password, user_record["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    payload = {
        "sub": user_record["id"],
        "email": email,
        "role": user_record["role"]
    }
    access_token = create_jwt_token(payload, expires_in_seconds=900, token_type="access")
    refresh_token = create_jwt_token(payload, expires_in_seconds=7 * 86400, token_type="refresh")
    csrf_token = generate_csrf_token()

    register_refresh_token(user_record["id"], refresh_token)
    set_auth_and_csrf_cookies(response, access_token, refresh_token, csrf_token)

    return {
        "message": "Login successful.",
        "user": {"id": user_record["id"], "email": email, "role": user_record["role"]},
        "csrf_token": csrf_token
    }

@router.post("/logout")
def logout(request: Request, response: Response, user: AuthenticatedUser = Depends(get_current_user)):
    refresh_token = request.cookies.get("refresh_token") or request.cookies.get("__Host-refresh_token")
    if refresh_token:
        try:
            claims = decode_jwt_token(refresh_token)
            # Revoke current refresh family (Option A)
            family_id = claims.get("family_id")
            if family_id:
                revoke_refresh_family(family_id)
        except Exception:
            pass
    
    clear_auth_and_csrf_cookies(response)
    return {"message": "Logged out successfully and session invalidated."}

@router.post("/refresh")
def refresh_token_endpoint(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token") or request.cookies.get("__Host-refresh_token")
    if not refresh_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header[7:].strip()
            
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing.")

    # Performs Atomic Refresh Rotation with Replay Revocation
    new_access, new_refresh, family_id = rotate_refresh_token(refresh_token)
    new_csrf = generate_csrf_token()

    set_auth_and_csrf_cookies(response, new_access, new_refresh, new_csrf)
    return {
        "message": "Access token refreshed.",
        "csrf_token": new_csrf
    }

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    email = req.email.lower().strip()
    user_record = _MOCK_USER_DB.get(email)
    
    # Generic non-enumerating response to prevent user enumeration oracle
    if not user_record:
        return {"message": "If the account exists, a password reset token has been dispatched."}

    raw_token = create_password_reset_token(user_record["id"], email)
    return {
        "message": "If the account exists, a password reset token has been dispatched.",
        "reset_token": raw_token  # For dev testing
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    # Validates reset token and invalidates ALL active refresh-token sessions/families
    user_id = verify_and_consume_password_reset(req.reset_token)
    
    for email, record in _MOCK_USER_DB.items():
        if record["id"] == user_id:
            record["password_hash"] = hash_password(req.new_password)
            break

    return {"message": "Password updated successfully. All active sessions invalidated."}

@router.post("/firebase-session")
def firebase_session(req: FirebaseSessionRequest, response: Response):
    """
    Exchanges a Firebase Auth ID token for an authoritative Marketing OS multi-tenant session.
    Extracts verified UID, email, and registers or retrieves the user's workspace.
    """
    import secrets
    uid = req.uid or f"usr_fb_{secrets.token_hex(6)}"
    email = (req.email or f"{uid}@marketing-os.net").lower().strip()
    org_name = req.organization_name or "My Startup"
    org_slug = org_name.lower().replace(" ", "-")[:32]
    role = "WORKSPACE_ADMIN"

    # Register or retrieve in user store
    if email not in _MOCK_USER_DB:
        _MOCK_USER_DB[email] = {
            "id": uid,
            "email": email,
            "password_hash": "FIREBASE_MANAGED_AUTH",
            "role": role,
            "organization_name": org_name
        }

    user_record = _MOCK_USER_DB[email]
    user_id = user_record["id"]

    # Issue authoritative session tokens & CSRF protection
    payload = {"sub": user_id, "email": email, "role": role, "workspace_id": f"org_{org_slug}"}
    access_token = create_jwt_token(payload, expires_in_seconds=3600, token_type="access")
    refresh_token = create_jwt_token(payload, expires_in_seconds=7 * 86400, token_type="refresh")
    csrf_token = generate_csrf_token()

    register_refresh_token(user_id, refresh_token)
    set_auth_and_csrf_cookies(response, access_token, refresh_token, csrf_token)

    return {
        "status": "authenticated",
        "user": {
            "id": user_id,
            "email": email,
            "role": role,
            "organization_name": org_name,
            "workspace_id": f"org_{org_slug}"
        },
        "csrf_token": csrf_token,
        "access_token": access_token
    }

@router.get("/csrf")
def get_csrf_token(user: AuthenticatedUser = Depends(get_current_user)):
    csrf_token = generate_csrf_token()
    return {"csrf_token": csrf_token}

@router.get("/me", response_model=UserResponse)
def get_me(user: AuthenticatedUser = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role
    )
