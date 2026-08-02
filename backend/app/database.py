import logging
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("database")

supabase: Client = None

try:
    if settings.SUPABASE_URL and settings.SUPABASE_KEY and "your-project" not in settings.SUPABASE_URL:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    else:
        logger.warning("Supabase URL/Key unconfigured - running in offline mock DB mode.")
except Exception as e:
    logger.warning(f"Supabase connection warning: {e}. Running in offline mock DB mode.")
