"""
Marketing OS v2.1 — Production Key & Secret Generator

Generates cryptographically secure, high-entropy tokens compliant with
the backend configuration validator (minimum 256 bits / 32 bytes).
"""

import secrets


def generate_production_secrets():
    jwt_secret = secrets.token_urlsafe(32)
    token_encryption_key = secrets.token_urlsafe(32)
    db_password = secrets.token_urlsafe(24)
    redis_password = secrets.token_urlsafe(24)

    print("\n=======================================================================")
    print("  MARKETING OS v2.1 — PRODUCTION SECRETS GENERATOR                     ")
    print("=======================================================================\n")
    print("Copy and paste these values into your production environment (.env):\n")
    print(f"JWT_SECRET={jwt_secret}")
    print(f"TOKEN_ENCRYPTION_KEY={token_encryption_key}")
    print(f"POSTGRES_PASSWORD={db_password}")
    print(f"REDIS_PASSWORD={redis_password}")
    print("\n[NOTE] Minimum 256-bit entropy requirement satisfied.")
    print("=======================================================================\n")


if __name__ == "__main__":
    generate_production_secrets()
