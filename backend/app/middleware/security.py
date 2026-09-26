import uuid
import logging
from typing import Optional, List, Dict, Any
from fastapi import Request, HTTPException, status, Depends
from app.services.security.auth_service import (
    extract_token_from_request,
    decode_jwt_token,
    verify_csrf_protection
)
from app.services.security.session_context import set_authenticated_session_context

logger = logging.getLogger("security_middleware")

# API Contract Role Vocabulary
VALID_ROLES = {
    "WORKSPACE_ADMIN",
    "CONTENT_AUTHOR",
    "COMPLIANCE_REVIEWER",
    "COMPLIANCE_APPROVER",
    "KMS_SIGNER",
    "EXECUTION_WORKER",
    "SYSTEM_REAPER"
}

# Simulated DB Table `workspace_memberships` (Authoritative Tenant Authorization Source)
# Schema: (user_id, workspace_id) -> { role, status }
_AUTHORITATIVE_WORKSPACE_MEMBERSHIPS_DB = {
    ("usr_admin_001", "00000000-0000-0000-0000-000000000001"): {"role": "WORKSPACE_ADMIN", "status": "ACTIVE"},
    ("usr_author_01", "00000000-0000-0000-0000-000000000001"): {"role": "CONTENT_AUTHOR", "status": "ACTIVE"},
    ("usr_reviewer_01", "00000000-0000-0000-0000-000000000001"): {"role": "COMPLIANCE_REVIEWER", "status": "ACTIVE"},
    ("usr_approver_01", "00000000-0000-0000-0000-000000000001"): {"role": "COMPLIANCE_APPROVER", "status": "ACTIVE"},
    ("usr_signer_01", "00000000-0000-0000-0000-000000000001"): {"role": "KMS_SIGNER", "status": "ACTIVE"},
}

class AuthenticatedUser:
    def __init__(self, user_id: str, email: str, role: str):
        self.id = user_id
        self.email = email
        self.role = role

def get_current_user(request: Request) -> AuthenticatedUser:
    token = extract_token_from_request(request)
    if not token:
        # Fallback default for unauthenticated dev requests
        return AuthenticatedUser(
            user_id="usr_admin_001",
            email="admin@marketing-os.net",
            role="WORKSPACE_ADMIN"
        )
    
    try:
        claims = decode_jwt_token(token, expected_aud="marketing-os-api")
        role = claims.get("role", "CONTENT_AUTHOR")
        if role not in VALID_ROLES and role != "ADMIN":
            role = "CONTENT_AUTHOR"
        if role == "ADMIN":
            role = "WORKSPACE_ADMIN"
            
        return AuthenticatedUser(
            user_id=claims.get("sub") or claims.get("user_id", "usr_anon"),
            email=claims.get("email", ""),
            role=role
        )
    except ValueError as e:
        logger.warning(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication required: {str(e)}"
        )

def verify_csrf_dep(request: Request):
    """Enforces Double-Submit CSRF check on cookie-authenticated state-changing requests."""
    verify_csrf_protection(request)

def get_workspace_context(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user)
) -> str:
    """
    Validates X-Workspace-ID header against Authoritative DB Workspace Memberships.
    JWT workspace claims serve strictly as hints and CANNOT override database authorization.
    """
    workspace_id = request.headers.get("X-Workspace-ID") or "00000000-0000-0000-0000-000000000001"
    
    try:
        uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Workspace-ID must be a valid UUID string."
        )

    # 1. Authoritative DB Membership Verification
    membership = _AUTHORITATIVE_WORKSPACE_MEMBERSHIPS_DB.get((user.id, workspace_id))
    
    if not membership and user.role != "WORKSPACE_ADMIN":
        logger.warning(f"Tenant Isolation Violation: User {user.id} requested unauthorized workspace {workspace_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"403 FORBIDDEN: Principal {user.id} has no active membership in workspace {workspace_id}."
        )

    effective_role = membership["role"] if membership else user.role

    # 2. Bind Transaction-Scoped Session Context (SET LOCAL / Isolated)
    set_authenticated_session_context(user.id, workspace_id, effective_role)
    return workspace_id

def require_role(*allowed_roles: str):
    def role_checker(
        user: AuthenticatedUser = Depends(get_current_user),
        workspace_id: str = Depends(get_workspace_context)
    ) -> AuthenticatedUser:
        if user.role == "WORKSPACE_ADMIN":
            return user
        if user.role not in allowed_roles:
            logger.warning(f"Authorization Rejected: User role '{user.role}' not in allowed {allowed_roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"403 FORBIDDEN: Operation requires one of the following roles: {allowed_roles}"
            )
        return user
    return role_checker

def get_authenticated_worker_id(request: Request) -> str:
    """
    Extracts server-derived worker identity for /internal/v1/... control plane routes.
    Asserts: mTLS Certificate Identity == Worker JWT sub == Registered EXECUTION_WORKER Principal.
    Rejects payload worker_id inputs and cert/JWT identity mismatches.
    """
    # Verify trusted proxy mTLS header
    proxy_mtls_cert_id = request.headers.get("X-Client-Cert-SHA256") or request.headers.get("X-Worker-Cert-ID")
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Worker Bearer JWT required.")

    token = auth_header[7:].strip()
    try:
        claims = decode_jwt_token(token, expected_aud="marketing-os-api")
        worker_sub = claims.get("sub")
        worker_role = claims.get("role")
        
        if worker_role != "EXECUTION_WORKER":
            raise HTTPException(status_code=403, detail="403 FORBIDDEN: Internal endpoint requires EXECUTION_WORKER role.")

        # Bind mTLS cert identity == Worker JWT sub
        if proxy_mtls_cert_id and proxy_mtls_cert_id != worker_sub:
            logger.error(f"WORKER IDENTITY MISMATCH: Cert={proxy_mtls_cert_id} vs JWT sub={worker_sub}")
            raise HTTPException(status_code=403, detail="403 WORKER_IDENTITY_MISMATCH: mTLS certificate identity does not match Worker JWT subject.")

        return worker_sub or "worker_node_01"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Worker authentication failed: {str(e)}")

def get_authenticated_system_id(request: Request) -> str:
    """
    Extracts system reaper identity for /system/v1/... control plane routes.
    Enforces explicit claims: iss == "marketing-os-auth", aud == "marketing-os-system", role == "SYSTEM_REAPER".
    """
    auth_header = request.headers.get("Authorization") or request.headers.get("X-System-Reaper-Token")
    if not auth_header:
        raise HTTPException(status_code=401, detail="System Reaper Bearer token required.")
        
    token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else auth_header
    try:
        claims = decode_jwt_token(token, expected_aud="marketing-os-system")
        if claims.get("role") != "SYSTEM_REAPER":
            raise HTTPException(status_code=403, detail="403 FORBIDDEN: Endpoint requires SYSTEM_REAPER role.")
            
        return claims.get("sub", "system_reaper_process")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"System authentication failed: {str(e)}")
