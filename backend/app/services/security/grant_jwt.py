import secrets
import logging
from typing import Dict, Any, Set
from fastapi import HTTPException, status
from app.services.security.auth_service import create_jwt_token, decode_jwt_token

logger = logging.getLogger("grant_jwt")

# Simulated DB atomic storage table `grant_jti_consumptions` with UNIQUE(jti)
_CONSUMED_GRANT_JTIS: Set[str] = set()

def create_grant_jwt(
    actor2_id: str,
    workspace_id: str,
    content_version_id: str,
    action: str = "APPROVE",
    expires_in_seconds: int = 900
) -> str:
    payload = {
        "iss": "marketing-os-auth",
        "aud": "marketing-os-approvals",
        "actor_id": actor2_id,
        "workspace_id": workspace_id,
        "content_version_id": content_version_id,
        "action": action
    }
    return create_jwt_token(payload, expires_in_seconds=expires_in_seconds, token_type="grant")

def verify_and_consume_grant_jwt(
    grant_token: str,
    actor1_id: str,
    workspace_id: str,
    content_version_id: str,
    author_id: str
) -> Dict[str, Any]:
    # 1. Decode Cryptographic JWT
    try:
        claims = decode_jwt_token(grant_token, expected_aud="marketing-os-approvals")
    except Exception as e:
        logger.error(f"Grant JWT decode failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"DUAL_ACTOR_VIOLATION: Invalid or expired approval grant token ({str(e)})."
        )

    if claims.get("type") != "grant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DUAL_ACTOR_VIOLATION: Token is not a dual-actor grant token."
        )

    grant_action = claims.get("action")
    target_version_id = claims.get("content_version_id")
    target_workspace_id = claims.get("workspace_id")
    actor2_id = claims.get("actor_id")
    jti = claims.get("jti")

    # 2. Scope & Target Assertions
    if grant_action != "APPROVE" or target_version_id != content_version_id or target_workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DUAL_ACTOR_VIOLATION: Invalid approval grant token scope, workspace, or target version mismatch."
        )

    # 3. Dual-Actor Identity Distinctness Assertion (Actor 1 != Actor 2)
    if actor1_id == actor2_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DUAL_ACTOR_VIOLATION: Approver 1 and Approver 2 must be distinct identities."
        )

    # 4. Author Isolation Assertion (Neither Approver is Content Author)
    if author_id in (actor1_id, actor2_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DUAL_ACTOR_VIOLATION: Author cannot act as compliance approver."
        )

    # 5. ATOMIC JTI CONSUMPTION (INSERT INTO grant_jti_consumptions ON CONFLICT DO NOTHING)
    if not jti or jti in _CONSUMED_GRANT_JTIS:
        logger.error(f"GRANT REPLAY DETECTED for JTI: {jti}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="409 GRANT_REPLAY_DETECTED: Dual-actor grant token has already been consumed."
        )

    _CONSUMED_GRANT_JTIS.add(jti)

    return {
        "actor2_id": actor2_id,
        "workspace_id": target_workspace_id,
        "content_version_id": target_version_id,
        "action": grant_action,
        "jti": jti
    }
