import base64
import hashlib
import json
import os
import secrets
from typing import Optional, Dict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings

class TokenEncryptionService:
    """
    Enterprise Token Encryption Service (AES-256-GCM Authenticated Encryption):
    - Authenticated encryption with associated data (AEAD) using AES-256-GCM
    - Unique 96-bit (12-byte) random nonce per encryption operation
    - Envelope structure: enc_v{version}:{nonce_b64}:{ciphertext_with_tag_b64}
    - Versioned key ring support for seamless, zero-downtime key rotation
    - Backward-compatible decryption for legacy v1 stream-cipher tokens
    """
    def __init__(self, key_ring: Optional[Dict[str, str]] = None, active_version: Optional[str] = None):
        self.active_version = active_version or getattr(settings, "ACTIVE_KEY_VERSION", "v2")
        raw_ring = key_ring or getattr(settings, "TOKEN_ENCRYPTION_KEY_RING", {
            "v2": settings.TOKEN_ENCRYPTION_KEY,
            "v1": "legacy_marketing_os_encryption_key_32bytes_v1!"
        })
        # Derive 256-bit keys for AES-256-GCM
        self.keys: Dict[str, bytes] = {}
        for ver, key_str in raw_ring.items():
            self.keys[ver] = hashlib.sha256(key_str.encode("utf-8")).digest()
        
        # Primary key bytes
        self.primary_key = self.keys.get(self.active_version, hashlib.sha256(settings.TOKEN_ENCRYPTION_KEY.encode()).digest())

    def encrypt_token(self, token: Optional[str], key_version: Optional[str] = None) -> Optional[str]:
        if not token:
            return None
        ver = key_version or self.active_version
        key_bytes = self.keys.get(ver, self.primary_key)
        
        # 12-byte cryptographically secure random nonce
        nonce = secrets.token_bytes(12)
        aesgcm = AESGCM(key_bytes)
        
        # Encrypt with authenticated tag (AESGCM appends 16-byte tag to ciphertext)
        ciphertext = aesgcm.encrypt(nonce, token.encode("utf-8"), associated_data=ver.encode("utf-8"))
        
        nonce_b64 = base64.urlsafe_b64encode(nonce).decode("ascii")
        ciphertext_b64 = base64.urlsafe_b64encode(ciphertext).decode("ascii")
        
        return f"enc_{ver}:{nonce_b64}:{ciphertext_b64}"

    def decrypt_token(self, encrypted_token: Optional[str]) -> Optional[str]:
        if not encrypted_token:
            return None
            
        # 1. Plaintext fallback (unencrypted mock/simulated tokens)
        if not encrypted_token.startswith("enc_"):
            return encrypted_token

        parts = encrypted_token.split(":")
        
        # 2. AES-256-GCM Versioned Format: enc_v{version}:{nonce_b64}:{ciphertext_b64}
        if len(parts) == 3:
            ver = parts[0][4:]  # Extract version after 'enc_'
            nonce_b64 = parts[1]
            ciphertext_b64 = parts[2]
            
            key_bytes = self.keys.get(ver, self.primary_key)
            try:
                nonce = base64.urlsafe_b64decode(nonce_b64.encode("ascii"))
                ciphertext = base64.urlsafe_b64decode(ciphertext_b64.encode("ascii"))
                aesgcm = AESGCM(key_bytes)
                decrypted = aesgcm.decrypt(nonce, ciphertext, associated_data=ver.encode("utf-8"))
                return decrypted.decode("utf-8")
            except Exception:
                # Key rotation retry across all available keys in the key ring
                for candidate_ver, candidate_key in self.keys.items():
                    if candidate_ver == ver:
                        continue
                    try:
                        aesgcm = AESGCM(candidate_key)
                        decrypted = aesgcm.decrypt(nonce, ciphertext, associated_data=ver.encode("utf-8"))
                        return decrypted.decode("utf-8")
                    except Exception:
                        pass
                return encrypted_token

        # 3. Legacy v1 stream-cipher fallback (enc_v1:{base64})
        if len(parts) == 2 and parts[0] == "enc_v1":
            encoded = parts[1]
            legacy_key = self.keys.get("v1", self.primary_key)
            try:
                raw_bytes = base64.urlsafe_b64decode(encoded.encode("ascii"))
                decrypted = bytearray()
                for i, b in enumerate(raw_bytes):
                    decrypted.append(b ^ legacy_key[i % len(legacy_key)])
                return decrypted.decode("utf-8")
            except Exception:
                return encrypted_token

        return encrypted_token

    def reencrypt_token_if_stale(self, encrypted_token: Optional[str]) -> Optional[str]:
        """Checks if a token was encrypted with an older key version and rotates it to active version."""
        if not encrypted_token or not encrypted_token.startswith(f"enc_{self.active_version}:"):
            plaintext = self.decrypt_token(encrypted_token)
            return self.encrypt_token(plaintext)
        return encrypted_token

token_crypto = TokenEncryptionService()
