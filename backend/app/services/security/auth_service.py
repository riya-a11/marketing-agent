import base64
import hashlib
import hmac
import json
import secrets
import time
import logging
from typing import Optional, Dict, Any, List, Set, Tuple
from fastapi import Response, Request, HTTPException, status
from app.config import settings

logger = logging.getLogger("auth_service")

# -----------------------------------------------------------------------------
# Password Security (PBKDF2-HMAC-SHA256 with 100,000 iterations & Salt)
# -----------------------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations
    )
    return f"pbkdf2_sha256${iterations}${salt}${derived.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not hashed_password.startswith("pbkdf2_sha256$"):
        return plain_password == hashed_password
    
    parts = hashed_password.split("$")
    if len(parts) != 4:
        return False
    
    _, iterations_str, salt, target_hex = parts
    iterations = int(iterations_str)
    derived = hashlib.pbkdf2_hmac(
        'sha256',
        plain_password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations
    )
    return hmac.compare_digest(derived.hex(), target_hex)

# -----------------------------------------------------------------------------
# Cryptographic JWT Engine (HS256)
# -----------------------------------------------------------------------------

def _urlsafe_b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def _urlsafe_b64decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_jwt_token(payload: Dict[str, Any], expires_in_seconds: int, token_type: str = "access") -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    token_id = secrets.token_hex(16)
    
    claims = {
        "iss": "marketing-os-auth",
        "aud": "marketing-os-api",
        **payload,
        "jti": token_id,
        "type": token_type,
        "iat": now,
        "exp": now + expires_in_seconds
    }
    
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    claims_json = json.dumps(claims, separators=(',', ':')).encode('utf-8')
    
    encoded_header = _urlsafe_b64encode(header_json)
    encoded_claims = _urlsafe_b64encode(claims_json)
    
    signing_input = f"{encoded_header}.{encoded_claims}".encode('utf-8')
    signature = hmac.new(
        settings.JWT_SECRET.encode('utf-8'),
        signing_input,
        hashlib.sha256
    ).digest()
    
    encoded_signature = _urlsafe_b64encode(signature)
    return f"{encoded_header}.{encoded_claims}.{encoded_signature}"

def decode_jwt_token(token: str, expected_aud: str = "marketing-os-api") -> Dict[str, Any]:
    if not token or token.count('.') != 2:
        raise ValueError("Invalid JWT token format.")
    
    encoded_header, encoded_claims, encoded_signature = token.split('.')
    
    signing_input = f"{encoded_header}.{encoded_claims}".encode('utf-8')
    expected_sig = hmac.new(
        settings.JWT_SECRET.encode('utf-8'),
        signing_input,
        hashlib.sha256
    ).digest()
    
    actual_sig = _urlsafe_b64decode(encoded_signature)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Invalid JWT signature.")
    
    claims_bytes = _urlsafe_b64decode(encoded_claims)
    claims = json.loads(claims_bytes.decode('utf-8'))
    
    now = int(time.time())
    if "exp" in claims and claims["exp"] < now:
        raise ValueError("JWT token has expired.")

    if claims.get("iss") != "marketing-os-auth":
        raise ValueError("Invalid JWT issuer.")

    if expected_aud and claims.get("aud") != expected_aud:
        raise ValueError(f"Invalid JWT audience. Expected {expected_aud}, got {claims.get('aud')}.")
    
    jti = claims.get("jti")
    family_id = claims.get("family_id")
    if is_token_revoked(jti, family_id):
        raise ValueError("JWT token has been revoked.")

    return claims

# -----------------------------------------------------------------------------
# Refresh-Token Family Rotation & Replay Protection Engine (DB UNIQUE token_hash)
# -----------------------------------------------------------------------------

# In-memory backing store simulating DB table `refresh_sessions` with UNIQUE(token_hash)
# Schema: token_hash -> { family_id, user_id, token_hash, revoked, replaced_by, created_at, expires_at }
_REFRESH_SESSIONS_DB: Dict[str, Dict[str, Any]] = {}
_FAMILY_REVOCATIONS: Set[str] = set()

def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

def register_refresh_token(user_id: str, raw_token: str, family_id: Optional[str] = None) -> str:
    token_h = hash_token(raw_token)
    fam_id = family_id or f"fam_{secrets.token_hex(12)}"
    
    if token_h in _REFRESH_SESSIONS_DB:
        raise ValueError("DB_INVARIANT_VIOLATION: UNIQUE(token_hash) constraint violated.")
        
    _REFRESH_SESSIONS_DB[token_h] = {
        "family_id": fam_id,
        "user_id": user_id,
        "token_hash": token_h,
        "revoked": False,
        "replaced_by": None,
        "created_at": int(time.time())
    }
    return fam_id

def rotate_refresh_token(raw_refresh_token: str) -> Tuple[str, str, str]:
    """
    Atomically consumes R1 and issues R2 in same family_id.
    If R1 is presented post-rotation (REPLAY ATTACK), revokes all tokens in family_id!
    Returns (new_access_token, new_refresh_token, family_id)
    """
    token_h = hash_token(raw_refresh_token)
    session = _REFRESH_SESSIONS_DB.get(token_h)
    
    if not session:
        # Unknown/invalid refresh token
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")
        
    family_id = session["family_id"]
    user_id = session["user_id"]
    
    # Check if family is already revoked
    if family_id in _FAMILY_REVOCATIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="401 REFRESH_TOKEN_REPLAY_DETECTED: Session family has been revoked due to replay attack."
        )

    # Replay Attack Detection: If token is already marked as revoked
    if session["revoked"]:
        logger.error(f"REPLAY ATTACK DETECTED for refresh token in family {family_id}! Revoking entire family.")
        _FAMILY_REVOCATIONS.add(family_id)
        # Mark all tokens in family as revoked
        for s in _REFRESH_SESSIONS_DB.values():
            if s["family_id"] == family_id:
                s["revoked"] = True
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="401 REFRESH_TOKEN_REPLAY_DETECTED: Refresh token replay detected. Entire session family revoked."
        )

    # Decode JWT validation
    claims = decode_jwt_token(raw_refresh_token)
    if claims.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    # Issue New Tokens
    payload = {
        "sub": user_id,
        "email": claims.get("email"),
        "role": claims.get("role"),
        "workspaces": claims.get("workspaces")
    }
    new_access = create_jwt_token(payload, expires_in_seconds=900, token_type="access")
    new_refresh = create_jwt_token(payload, expires_in_seconds=7 * 86400, token_type="refresh")
    new_token_h = hash_token(new_refresh)

    # Atomic state transition: Mark R1 revoked, point to R2
    session["revoked"] = True
    session["replaced_by"] = new_token_h

    # Register R2 in family
    register_refresh_token(user_id, new_refresh, family_id=family_id)

    return new_access, new_refresh, family_id

_REVOKED_TOKENS: Set[str] = set()

def revoke_refresh_family(family_id: str):
    if family_id:
        _FAMILY_REVOCATIONS.add(family_id)
        for s in _REFRESH_SESSIONS_DB.values():
            if s["family_id"] == family_id:
                s["revoked"] = True

def revoke_token(jti_or_family: str):
    if jti_or_family:
        _REVOKED_TOKENS.add(jti_or_family)
        revoke_refresh_family(jti_or_family)

def is_token_revoked(jti: Optional[str] = None, family_id: Optional[str] = None) -> bool:
    if jti and jti in _REVOKED_TOKENS:
        return True
    if family_id and family_id in _FAMILY_REVOCATIONS:
        return True
    return False

def revoke_all_user_sessions(user_id: str):
    """Revokes ALL refresh token families for a user account (e.g. post password reset)."""
    for s in _REFRESH_SESSIONS_DB.values():
        if s["user_id"] == user_id:
            s["revoked"] = True
            _FAMILY_REVOCATIONS.add(s["family_id"])

# -----------------------------------------------------------------------------
# Password Reset Token Manager (Hashed Secrets at Rest)
# -----------------------------------------------------------------------------

_RESET_TOKENS_DB: Dict[str, Dict[str, Any]] = {}

def create_password_reset_token(user_id: str, email: str) -> str:
    raw_token = secrets.token_urlsafe(32)
    token_h = hash_token(raw_token)
    expires_at = int(time.time()) + 900
    
    _RESET_TOKENS_DB[token_h] = {
        "user_id": user_id,
        "email": email,
        "expires_at": expires_at,
        "used": False
    }
    return raw_token

def verify_and_consume_password_reset(raw_token: str) -> str:
    token_h = hash_token(raw_token)
    record = _RESET_TOKENS_DB.get(token_h)
    
    if not record or record["used"] or record["expires_at"] < int(time.time()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired password reset token.")
    
    record["used"] = True
    user_id = record["user_id"]
    
    # Invalidate ALL active refresh-token sessions/families for user
    revoke_all_user_sessions(user_id)
    return user_id

# -----------------------------------------------------------------------------
# CSRF Token Protection Engine (Double-Submit + Mixed-Auth Enforcement)
# -----------------------------------------------------------------------------

def generate_csrf_token() -> str:
    return secrets.token_hex(32)

def set_auth_and_csrf_cookies(response: Response, access_token: str, refresh_token: str, csrf_token: str):
    # Cookie Hardening with __Host- prefix conventions
    is_prod = settings.ENVIRONMENT != "development"
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=7 * 86400,
        path="/"
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # Readable by frontend JS to set X-CSRF-Token header
        secure=is_prod,
        samesite="lax",
        max_age=7 * 86400,
        path="/"
    )

def clear_auth_and_csrf_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="csrf_token", path="/")

def verify_csrf_protection(request: Request):
    """
    Enforces double-submit CSRF token validation.
    CRITICAL RULE: If an authentication cookie is present on a state-changing request (POST/PUT/PATCH/DELETE),
    CSRF validation MUST be enforced, regardless of whether an Authorization header is also present!
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    cookie_access_token = request.cookies.get("access_token") or request.cookies.get("__Host-access_token")
    auth_header = request.headers.get("Authorization")

    # Pure Bearer-only request (No session cookies present) -> CSRF check safely bypassed
    if not cookie_access_token and auth_header and auth_header.startswith("Bearer "):
        return

    # If cookie access token is present (or mixed-auth request), MUST enforce CSRF!
    if cookie_access_token or not auth_header:
        csrf_cookie = request.cookies.get("csrf_token") or request.cookies.get("__Host-csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")

        if not csrf_cookie or not csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="403 CSRF_TOKEN_MISSING: State-changing request requires valid CSRF cookie and X-CSRF-Token header."
            )

        if not hmac.compare_digest(csrf_cookie, csrf_header):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="403 CSRF_TOKEN_INVALID: CSRF token header mismatch."
            )

def extract_token_from_request(request: Request) -> Optional[str]:
    # 1. Cookie Authentication takes precedence for browser sessions
    token = request.cookies.get("access_token") or request.cookies.get("__Host-access_token")
    if token:
        return token
    
    # 2. Bearer Header Authentication fallback
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    
    return None
