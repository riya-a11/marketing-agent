import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AI Marketing Assistant API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    MIN_QUALITY_SCORE: int = 85
    
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_KEY: str = "your-anon-key"
    
    OPENAI_API_KEY: str = ""
    NVIDIA_NIM_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    
    # Media Storage Subsystem Settings
    MEDIA_STORAGE_TYPE: str = "local"
    MEDIA_PUBLIC_BASE_URL: str = "http://127.0.0.1:8000"
    MAX_MEDIA_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB
    
    # Social Media Platform Live Credentials (Optional - Mock mode active if empty)
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    
    X_CLIENT_ID: str = ""
    X_CLIENT_SECRET: str = ""
    X_BEARER_TOKEN: str = ""
    
    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_APP_SECRET: str = ""
    META_ACCESS_TOKEN: str = ""

    # Security & Token Encryption Settings (Multi-Tenant OAuth Protection)
    TOKEN_ENCRYPTION_KEY: str = "super_secret_marketing_os_token_encryption_key_32bytes!"
    JWT_SECRET: str = "marketing_os_jwt_session_signing_secret_key_2026"

    # CORS Policy Settings
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Redis Distributed Queue Settings
    REDIS_URL: str = "redis://localhost:6379/0"

    # n8n Automation Engine Settings
    N8N_WEBHOOK_URL: str = "http://localhost:5678/webhook/publish-campaign"
    N8N_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

    def validate_production_invariants(self):
        """Enforces P0 security and configuration invariants when running in production."""
        if self.ENVIRONMENT == "production":
            # 1. CORS Validation
            if not self.ALLOWED_ORIGINS:
                raise RuntimeError("FATAL CRITICAL: Production cannot start with empty ALLOWED_ORIGINS.")
            if "*" in self.ALLOWED_ORIGINS:
                raise RuntimeError("FATAL CRITICAL: Production ALLOWED_ORIGINS cannot contain wildcard '*'.")
            for origin in self.ALLOWED_ORIGINS:
                if "localhost" in origin or "127.0.0.1" in origin:
                    raise RuntimeError(f"FATAL CRITICAL: Production ALLOWED_ORIGINS cannot contain development origin: {origin}")
                if not origin.startswith("https://"):
                    raise RuntimeError(f"FATAL CRITICAL: Production ALLOWED_ORIGINS must use HTTPS: {origin}")

            # 2. Secret Entropy & Default Key Checks
            if self.JWT_SECRET == "marketing_os_jwt_session_signing_secret_key_2026":
                raise RuntimeError("FATAL CRITICAL: Production cannot start with default JWT_SECRET.")
            if len(self.JWT_SECRET.encode("utf-8")) < 32:
                raise RuntimeError("FATAL CRITICAL: Production JWT_SECRET must have at least 32 bytes (256 bits) of entropy.")

            if self.TOKEN_ENCRYPTION_KEY == "super_secret_marketing_os_token_encryption_key_32bytes!":
                raise RuntimeError("FATAL CRITICAL: Production cannot start with default TOKEN_ENCRYPTION_KEY.")
            if len(self.TOKEN_ENCRYPTION_KEY.encode("utf-8")) < 32:
                raise RuntimeError("FATAL CRITICAL: Production TOKEN_ENCRYPTION_KEY must have at least 32 bytes of entropy.")

settings = Settings()
settings.validate_production_invariants()

