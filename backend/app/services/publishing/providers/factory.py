import logging
from typing import Dict
from app.services.publishing.providers.base import MarketingOSProviderInterface
from app.services.publishing.providers.linkedin_adapter import LinkedInAdapter

logger = logging.getLogger("provider_factory")

class ProviderAdapterFactory:
    """
    Factory for retrieving platform adapters.
    Ensures core application logic consumes MarketingOSProviderInterface cleanly.
    """
    _adapters: Dict[str, MarketingOSProviderInterface] = {
        "linkedin": LinkedInAdapter()
    }

    @classmethod
    def get_adapter(cls, platform: str) -> MarketingOSProviderInterface:
        adapter = cls._adapters.get(platform.lower())
        if not adapter:
            # Fallback mock adapter for untested platforms
            logger.info(f"Using default adapter for platform: {platform}")
            return cls._adapters["linkedin"]
        return adapter
