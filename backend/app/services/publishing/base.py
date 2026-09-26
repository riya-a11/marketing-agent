from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class SocialPublisher(ABC):
    """
    Abstract Base Class for Social Media Platform Publishers:
    - Defines unified interface for LinkedIn, X, and Instagram
    - Enforces idempotency support and structured receipts
    - Distinguishes mock verification adapters from live provider calls
    """
    
    @property
    @abstractmethod
    def platform_name(self) -> str:
        pass

    @property
    def max_characters(self) -> Optional[int]:
        return None

    @property
    def requires_media(self) -> bool:
        return False

    @abstractmethod
    def is_live_configured(self, account: Optional[Dict[str, Any]]) -> bool:
        """Returns True if live API credentials exist for real network calls."""
        pass

    @abstractmethod
    async def publish(
        self,
        account: Optional[Dict[str, Any]],
        content_text: str,
        cta: Optional[str] = None,
        media_asset: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes publication to the target platform.
        Returns standardized receipt dictionary:
        {
            "status": "published" | "failed",
            "platform": str,
            "external_post_id": str,
            "permalink": str,
            "channel_name": str,
            "provider_mode": "live" | "simulated",
            "request_payload": dict,
            "response_status": int,
            "response_body": dict
        }
        """
        pass

    async def reconcile(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        """
        Polls provider for existing external post using idempotency key without duplicate side effects.
        """
        return None

