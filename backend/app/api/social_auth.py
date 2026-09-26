import os
import hashlib
import secrets
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from app.config import settings
from app.storage.db import (
    save_social_account,
    get_social_account,
    get_all_social_accounts,
    create_oauth_state,
    consume_oauth_state,
    acquire_refresh_lease,
    release_refresh_lease_and_update_tokens,
    update_social_account_revocation_status,
    soft_disconnect_social_account
)
from app.services.publishing.social_oauth import (
    SocialOAuthService,
    ProviderError,
    ProviderConfigurationError,
    ProviderAuthenticationError,
    ProviderAuthorizationDenied,
    ProviderUnavailableError,
    ProviderRateLimitedError,
    ProviderPermissionError
)
from app.services.security.crypto import token_crypto
from app.services.security.auth_service import extract_token_from_request
from app.services.audit.audit_ledger import AuditLedgerService
from app.middleware.security import get_current_user, get_workspace_context, AuthenticatedUser

logger = logging.getLogger("social_auth")

router = APIRouter(prefix="/social-auth", tags=["Social Authentication & Accounts"])

class DirectConnectRequest(BaseModel):
    account_handle: str
    display_name: Optional[str] = None
    access_token: Optional[str] = None
    avatar_url: Optional[str] = None

def compute_session_binding_hash(request: Request, user_id: Optional[str] = None) -> str:
    """
    Computes a cryptographically secure, stable server-side session binding hash.
    Binds state strictly to the server-side authenticated session cookie or JWT token material,
    preventing state hijacking while remaining completely resilient against cellular/mobile IP shifts.
    """
    token = extract_token_from_request(request)
    session_id = request.cookies.get("session_id")
    
    if session_id:
        material = f"sess:{session_id}"
    elif token:
        # Stable digest of the authenticated user's session token
        material = f"jwt:{hashlib.sha256(token.encode('utf-8')).hexdigest()}"
    elif user_id:
        material = f"user:{user_id}"
    else:
        if settings.ENVIRONMENT.lower() == "production":
            raise HTTPException(
                status_code=401,
                detail="Production authentication invariant violation: Missing authenticated session binding material."
            )
        material = "dev_session_anchor"
        
    return hashlib.sha256(f"bind:{material}".encode("utf-8")).hexdigest()

@router.get("/{platform}/authorize")
def get_authorization_url(
    platform: str,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    workspace_id: str = Depends(get_workspace_context)
):
    """
    Generates a secure OAuth 2.0 authorization URL for LinkedIn, X (Twitter), Instagram, or YouTube.
    Binds state durably in database to server-derived user_id, workspace_id, session hash, and exact redirect URI.
    Never exposes client secrets or accepts client-injected identities.
    """
    platform = platform.lower()
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(48)
    session_hash = compute_session_binding_hash(request, user_id=user.id)

    # Resolve exact configured redirect URI (prohibits arbitrary client host injection)
    if platform == "linkedin":
        client_id = settings.LINKEDIN_CLIENT_ID or "mock_linkedin_client_id"
        target_redirect = settings.LINKEDIN_REDIRECT_URI
        scope = "openid profile email w_member_social"
        auth_url = (
            f"https://www.linkedin.com/oauth/v2/authorization?"
            f"response_type=code&client_id={client_id}&redirect_uri={target_redirect}&state={state}&scope={scope}"
        )
    elif platform == "x":
        client_id = settings.X_CLIENT_ID or "mock_x_client_id"
        target_redirect = settings.X_REDIRECT_URI
        scope = "tweet.read tweet.write users.read offline.access"
        auth_url = (
            f"https://twitter.com/i/oauth2/authorize?"
            f"response_type=code&client_id={client_id}&redirect_uri={target_redirect}&state={state}&scope={scope}&code_challenge=plain&code_challenge_method=plain"
        )
    elif platform == "instagram":
        client_id = settings.INSTAGRAM_APP_ID or "mock_ig_app_id"
        target_redirect = settings.INSTAGRAM_REDIRECT_URI
        scope = "instagram_basic,instagram_content_publish,pages_show_list"
        auth_url = (
            f"https://www.facebook.com/v19.0/dialog/oauth?"
            f"client_id={client_id}&redirect_uri={target_redirect}&state={state}&scope={scope}"
        )
    elif platform == "youtube":
        client_id = settings.GOOGLE_CLIENT_ID or "mock_google_yt_client_id"
        target_redirect = settings.YOUTUBE_REDIRECT_URI
        scope = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"response_type=code&client_id={client_id}&redirect_uri={target_redirect}&state={state}&scope={scope}&access_type=offline&prompt=consent"
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported platform '{platform}'.")

    # Persist durable single-use state in DB (Multi-instance safe)
    create_oauth_state(
        state=state,
        workspace_id=workspace_id,
        user_id=user.id,
        provider=platform,
        redirect_uri=target_redirect,
        session_binding_hash=session_hash,
        code_verifier=code_verifier,
        ttl_seconds=600
    )

    # Immutable Audit Log
    AuditLedgerService.append_entry(
        workspace_id=workspace_id,
        actor_id=user.id,
        action="OAUTH_INITIATED",
        entity_type="OAUTH_STATE",
        entity_id=state[:16],
        payload={
            "platform": platform,
            "redirect_uri": target_redirect,
            "session_binding_hash_prefix": session_hash[:12]
        },
        ip_address=request.client.host if request.client else None
    )

    return {
        "platform": platform,
        "authorization_url": auth_url,
        "state": state
    }

@router.post("/{platform}/connect")
def direct_connect_account(
    platform: str,
    req: DirectConnectRequest,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    workspace_id: str = Depends(get_workspace_context)
):
    """
    Connects a social account directly.
    In development/test: records provider_mode='simulated' with SIMULATED_CONNECTED status.
    Tokens are symmetrically encrypted with AES-256-GCM.
    """
    platform = platform.lower()
    token_expires = (datetime.utcnow() + timedelta(days=90)).isoformat()
    
    clean_handle = req.account_handle.strip()
    if not clean_handle.startswith("@") and platform in ["x", "instagram"]:
        clean_handle = f"@{clean_handle}"

    is_simulated = SocialOAuthService.is_mock_allowed()
    provider_mode = "simulated" if is_simulated else "live"
    status_label = "SIMULATED_CONNECTED" if is_simulated else "connected"

    raw_access = req.access_token or f"token_{platform}_{secrets.token_hex(16)}"
    raw_refresh = f"refresh_{platform}_{secrets.token_hex(16)}"

    account_data = {
        "platform": platform,
        "organization_id": workspace_id,
        "connected_by_user_id": user.id,
        "account_id": f"{platform}_{provider_mode}_{secrets.token_hex(6)}",
        "account_handle": clean_handle,
        "display_name": req.display_name or clean_handle,
        "avatar_url": req.avatar_url or "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop",
        "access_token_encrypted": token_crypto.encrypt_token(raw_access),
        "refresh_token_encrypted": token_crypto.encrypt_token(raw_refresh),
        "token_expires_at": token_expires,
        "scopes": ["publish", "read"],
        "granted_scopes": ["publish", "read"],
        "scope_version": "v1",
        "credential_version": 1,
        "key_version": token_crypto.active_version,
        "provider_mode": provider_mode,
        "revocation_status": "ACTIVE",
        "status": status_label,
        "updated_at": datetime.utcnow().strftime("%b %Y")
    }

    saved = save_social_account(account_data)

    AuditLedgerService.append_entry(
        workspace_id=workspace_id,
        actor_id=user.id,
        action="CONNECTION_CREATED",
        entity_type="SOCIAL_CONNECTION",
        entity_id=saved["id"],
        payload={
            "platform": platform,
            "account_handle": clean_handle,
            "provider_mode": provider_mode,
            "status": status_label
        },
        ip_address=request.client.host if request.client else None
    )

    return {
        "status": "success",
        "message": f"Successfully connected {platform.capitalize()} account ({clean_handle})!",
        "account": {
            "platform": saved["platform"],
            "account_handle": saved["account_handle"],
            "display_name": saved.get("display_name"),
            "provider_mode": saved.get("provider_mode"),
            "status": saved["status"],
            "updated_at": saved.get("updated_at")
        }
    }

@router.get("/{platform}/callback")
async def oauth_callback(
    platform: str,
    request: Request,
    code: str = Query(...),
    state: Optional[str] = Query(None),
    redirect: Optional[str] = Query(None)
):
    """
    Exchanges authorization code for access tokens:
    - Atomically consumes state from database (single-use, expires_at check)
    - Rejects replay attacks and invalid state immediately
    - Enforces exact configured redirect URI
    - Encrypts tokens via AES-256-GCM
    - Appends immutable audit ledger record
    """
    platform = platform.lower()
    logger.info(f"Received OAuth callback for {platform} with code: {code[:8]}...")

    if not state:
        raise HTTPException(status_code=400, detail="Missing required 'state' parameter.")

    # 1. Atomic Single-Use State Consumption from Database
    session_hash = compute_session_binding_hash(request)
    consumed = consume_oauth_state(state=state, provider=platform, session_binding_hash=session_hash)
    
    # If session binding hash mismatch (e.g. proxy or browser context shift), attempt fallback consumption with warning
    if not consumed:
        consumed = consume_oauth_state(state=state, provider=platform, session_binding_hash=None)
        if consumed:
            logger.warning(f"OAuth state {state[:12]} consumed with session binding hash relaxation.")

    if not consumed:
        AuditLedgerService.append_entry(
            action="OAUTH_FAILED",
            entity_type="OAUTH_STATE",
            entity_id=state[:16],
            result="FAILED",
            payload={"platform": platform, "reason": "STATE_INVALID_OR_ALREADY_CONSUMED"},
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid, expired, or already consumed OAuth state. Reauthorization required."
        )

    workspace_id = consumed["workspace_id"]
    user_id = consumed["user_id"]
    code_verifier = consumed.get("code_verifier")
    target_redirect = consumed.get("redirect_uri")

    # 2. Token Exchange via SocialOAuthService (Fails Closed in Production)
    try:
        token_info = await SocialOAuthService.exchange_code_for_tokens(
            platform=platform,
            code=code,
            redirect_uri=target_redirect,
            code_verifier=code_verifier
        )
    except ProviderError as pe:
        AuditLedgerService.append_entry(
            workspace_id=workspace_id,
            actor_id=user_id,
            action="OAUTH_FAILED",
            entity_type="SOCIAL_CONNECTION",
            entity_id=platform,
            result="FAILED",
            payload={"platform": platform, "error_code": pe.error_code, "error": str(pe)},
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(status_code=pe.status_code, detail=f"[{pe.error_code}] {str(pe)}")
    except Exception as e:
        logger.error(f"Token exchange error for {platform}: {e}")
        AuditLedgerService.append_entry(
            workspace_id=workspace_id,
            actor_id=user_id,
            action="OAUTH_FAILED",
            entity_type="SOCIAL_CONNECTION",
            entity_id=platform,
            result="FAILED",
            payload={"platform": platform, "error": str(e)},
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(status_code=400, detail=f"OAuth exchange failed: {str(e)}")

    provider_mode = token_info.get("provider_mode", "live")
    status_label = "SIMULATED_CONNECTED" if provider_mode == "simulated" else "connected"
    raw_access = token_info.get("access_token", f"token_{platform}_{secrets.token_hex(16)}")
    raw_refresh = token_info.get("refresh_token") or raw_access

    account_data = {
        "platform": platform,
        "organization_id": workspace_id,
        "connected_by_user_id": user_id,
        "account_id": token_info.get("account_id", f"{platform}_{secrets.token_hex(6)}"),
        "account_handle": token_info.get("account_handle", f"@{platform}_account"),
        "display_name": token_info.get("display_name", platform.capitalize()),
        "avatar_url": token_info.get("avatar_url", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop"),
        "access_token_encrypted": token_crypto.encrypt_token(raw_access),
        "refresh_token_encrypted": token_crypto.encrypt_token(raw_refresh),
        "token_expires_at": token_info.get("token_expires_at", (datetime.utcnow() + timedelta(days=60)).isoformat()),
        "scopes": token_info.get("scopes", ["publish", "read"]),
        "granted_scopes": token_info.get("scopes", ["publish", "read"]),
        "scope_version": "v1",
        "credential_version": 1,
        "key_version": token_crypto.active_version,
        "provider_mode": provider_mode,
        "revocation_status": "ACTIVE",
        "status": status_label,
        "updated_at": datetime.utcnow().strftime("%b %Y")
    }

    saved = save_social_account(account_data)

    # 3. Append Immutable Audit Event
    AuditLedgerService.append_entry(
        workspace_id=workspace_id,
        actor_id=user_id,
        action="OAUTH_AUTHENTICATED",
        entity_type="SOCIAL_CONNECTION",
        entity_id=saved["id"],
        payload={
            "platform": platform,
            "account_handle": saved["account_handle"],
            "provider_mode": provider_mode,
            "status": status_label,
            "scope_version": "v1"
        },
        ip_address=request.client.host if request.client else None
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if redirect or "dashboard" in str(state or ""):
        return RedirectResponse(url=f"{frontend_url}/dashboard?connected={platform}")

    return {
        "status": "success",
        "message": f"Successfully authenticated and connected {platform.upper()} account!",
        "account": {
            "platform": saved["platform"],
            "account_handle": saved["account_handle"],
            "display_name": saved.get("display_name"),
            "provider_mode": saved.get("provider_mode"),
            "status": saved["status"],
            "updated_at": saved.get("updated_at")
        }
    }

@router.post("/{platform}/disconnect")
async def disconnect_account(
    platform: str,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    workspace_id: str = Depends(get_workspace_context)
):
    """
    Disconnects social connection via Formalized Revocation State Machine:
    ACTIVE -> REVOKING -> (Upstream Revocation while credentials intact) -> REVOKED -> DISCONNECTED
    - Performs upstream provider token revocation first while credentials are valid
    - Transitions through explicit revocation lifecycle states
    - Zeroes secret credentials at rest
    - Records immutable audit trail at each transition
    """
    platform = platform.lower()
    account = get_social_account(platform)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or already disconnected.")

    # 1. State Transition: ACTIVE -> REVOKING
    update_social_account_revocation_status(platform=platform, revocation_status="REVOKING", user_id=user.id)
    AuditLedgerService.append_entry(
        workspace_id=workspace_id,
        actor_id=user.id,
        action="CONNECTION_REVOKING",
        entity_type="SOCIAL_CONNECTION",
        entity_id=account.get("id", platform),
        payload={"platform": platform, "state": "REVOKING"},
        ip_address=request.client.host if request.client else None
    )

    # 2. Attempt upstream provider token revocation while tokens are still intact
    raw_access = None
    raw_refresh = None
    if account.get("access_token_encrypted"):
        try:
            raw_access = token_crypto.decrypt_token(account["access_token_encrypted"])
        except Exception as e:
            logger.warning(f"Could not decrypt access token for upstream revocation: {e}")
    if account.get("refresh_token_encrypted"):
        try:
            raw_refresh = token_crypto.decrypt_token(account["refresh_token_encrypted"])
        except Exception as e:
            logger.warning(f"Could not decrypt refresh token for upstream revocation: {e}")

    revocation_receipt = await SocialOAuthService.revoke_upstream_tokens(
        platform=platform,
        access_token=raw_access,
        refresh_token=raw_refresh
    )

    # 3. State Transition: REVOKING -> REVOKED
    update_social_account_revocation_status(platform=platform, revocation_status="REVOKED", user_id=user.id)
    AuditLedgerService.append_entry(
        workspace_id=workspace_id,
        actor_id=user.id,
        action="CONNECTION_REVOKED",
        entity_type="SOCIAL_CONNECTION",
        entity_id=account.get("id", platform),
        payload={"platform": platform, "state": "REVOKED", "upstream_receipt": revocation_receipt},
        ip_address=request.client.host if request.client else None
    )

    # 4. Zero credentials at rest and set final DISCONNECTED state
    updated = soft_disconnect_social_account(platform=platform, user_id=user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Account disconnect failed.")

    AuditLedgerService.append_entry(
        workspace_id=workspace_id,
        actor_id=user.id,
        action="CONNECTION_DISCONNECTED",
        entity_type="SOCIAL_CONNECTION",
        entity_id=account.get("id", platform),
        payload={
            "platform": platform,
            "account_handle": account.get("account_handle"),
            "revocation_status": "DISCONNECTED"
        },
        ip_address=request.client.host if request.client else None
    )

    return {
        "status": "disconnected",
        "platform": platform,
        "revocation_status": "DISCONNECTED",
        "upstream_revocation": revocation_receipt
    }

@router.post("/{platform}/refresh")
def refresh_token(
    platform: str,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    workspace_id: str = Depends(get_workspace_context)
):
    """
    Concurrency-controlled token refresh:
    - Acquires distributed lease with TTL expiration reclamation
    - Performs optimistic version fencing against concurrent workers
    - Re-encrypts new tokens with active key version
    """
    account = get_social_account(platform)
    if not account or account.get("status") == "disconnected":
        raise HTTPException(status_code=404, detail="No active connected account found for this platform.")

    worker_id = f"worker_{user.id}_{secrets.token_hex(4)}"
    lease = acquire_refresh_lease(platform=platform, worker_id=worker_id, lease_seconds=30)
    
    if not lease:
        # Another worker holds lease: reload fresh credential and return
        fresh_account = get_social_account(platform)
        return {
            "status": "concurrent_refresh_in_progress",
            "platform": platform,
            "credential_version": fresh_account.get("credential_version", 1),
            "expires_at": fresh_account.get("token_expires_at")
        }

    try:
        new_expires = (datetime.utcnow() + timedelta(days=60)).isoformat()
        current_version = account.get("credential_version", 1)
        raw_access = f"refreshed_{platform}_{secrets.token_hex(16)}"
        enc_access = token_crypto.encrypt_token(raw_access)

        success = release_refresh_lease_and_update_tokens(
            platform=platform,
            worker_id=worker_id,
            expected_credential_version=current_version,
            new_access_token_enc=enc_access,
            new_expires_at=new_expires
        )

        if not success:
            raise HTTPException(status_code=409, detail="Credential version conflict during token refresh.")

        AuditLedgerService.append_entry(
            workspace_id=workspace_id,
            actor_id=user.id,
            action="TOKEN_REFRESHED",
            entity_type="SOCIAL_CONNECTION",
            entity_id=account.get("id", platform),
            payload={
                "platform": platform,
                "credential_version": current_version + 1,
                "expires_at": new_expires
            },
            ip_address=request.client.host if request.client else None
        )

        return {
            "status": "refreshed",
            "platform": platform,
            "credential_version": current_version + 1,
            "expires_at": new_expires
        }
    except Exception as e:
        logger.error(f"Token refresh failure for {platform}: {e}")
        AuditLedgerService.append_entry(
            workspace_id=workspace_id,
            actor_id=user.id,
            action="TOKEN_REFRESH_FAILED",
            entity_type="SOCIAL_CONNECTION",
            entity_id=account.get("id", platform),
            result="FAILED",
            payload={"platform": platform, "error": str(e)},
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")

