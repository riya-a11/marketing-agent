import hmac
import hashlib
import base64
import json
import secrets
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.config import settings

class OAuthStateManager:
    """
    Multi-tenant OAuth State Manager:
    - Binds user_id, organization_id, and platform to the authorization state
    - Cryptographically signs state tokens with HMAC-SHA256
    - Stores PKCE code_verifier securely on the backend
    - Validates state expiration (15 minutes TTL) and prevents CSRF
    """
    _pkce_store: Dict[str, str] = {}

    @classmethod
    def generate_state(
        cls,
        organization_id: str,
        user_id: str,
        platform: str,
        code_verifier: Optional[str] = None
    ) -> str:
        nonce = secrets.token_hex(12)
        payload = {
            "org_id": organization_id,
            "user_id": user_id,
            "platform": platform.lower(),
            "nonce": nonce,
            "exp": (datetime.utcnow() + timedelta(minutes=15)).timestamp()
        }
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("ascii")

        # Sign with HMAC-SHA256
        sig = hmac.new(
            settings.JWT_SECRET.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256
        ).hexdigest()

        state_token = f"{payload_b64}.{sig}"
        if code_verifier:
            cls._pkce_store[nonce] = code_verifier
        return state_token

    @classmethod
    def verify_and_decode(cls, state_token: str) -> Dict[str, Any]:
        try:
            parts = state_token.split(".")
            if len(parts) != 2:
                raise ValueError("Invalid state format")

            payload_b64, sig = parts
            expected_sig = hmac.new(
                settings.JWT_SECRET.encode("utf-8"),
                payload_b64.encode("ascii"),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(sig, expected_sig):
                raise ValueError("State signature verification failed")

            payload_bytes = base64.urlsafe_b64decode(payload_b64.encode("ascii"))
            payload = json.loads(payload_bytes.decode("utf-8"))

            if datetime.utcnow().timestamp() > payload.get("exp", 0):
                raise ValueError("State token has expired")

            nonce = payload.get("nonce")
            code_verifier = cls._pkce_store.pop(nonce, None)
            payload["code_verifier"] = code_verifier
            return payload

        except Exception as e:
            raise ValueError(f"Invalid or tampered OAuth state: {e}")

oauth_state_mgr = OAuthStateManager()
