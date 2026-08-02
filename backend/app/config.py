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

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
