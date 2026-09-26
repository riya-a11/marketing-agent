from typing import Dict, Any, List, Optional
from app.services.publishing.base import SocialPublisher
from app.services.publishing.linkedin import LinkedInPublisher
from app.services.publishing.x import XPublisher
from app.services.publishing.instagram import InstagramPublisher
from app.services.publishing.youtube import YouTubePublisher

REQUIRED_PUBLISH_SCOPES = {
    "linkedin": {"w_member_social"},
    "x": {"tweet.write"},
    "instagram": {"instagram_content_publish"},
    "youtube": {"youtube.upload"}
}

class PublisherFactory:
    """
    Enterprise Factory resolving platform-specific publisher instances
    and exposing capability matrix to frontend and backend validation layers.
    """
    _publishers: Dict[str, SocialPublisher] = {
        "linkedin": LinkedInPublisher(),
        "x": XPublisher(),
        "instagram": InstagramPublisher(),
        "youtube": YouTubePublisher(),
    }

    @classmethod
    def get_publisher(cls, platform: str) -> SocialPublisher:
        platform_norm = platform.lower().strip()
        publisher = cls._publishers.get(platform_norm)
        if not publisher:
            raise ValueError(f"No social publisher adapter registered for platform '{platform}'.")
        return publisher

    @classmethod
    def supported_platforms(cls) -> List[str]:
        return list(cls._publishers.keys())

    @classmethod
    def verify_account_scopes(cls, platform: str, account: Optional[Dict[str, Any]]) -> bool:
        """
        Validates that the connected social account holds the required publishing scopes.
        Fails fast prior to dispatch if required scope capabilities were ungranted.
        """
        if not account:
            return True
        granted = account.get("granted_scopes") or account.get("scopes") or []
        if isinstance(granted, str):
            try:
                import json
                granted = json.loads(granted)
            except Exception:
                granted = [granted]
        granted_set = set(granted) if isinstance(granted, (list, set, tuple)) else {str(granted)}
        
        required = REQUIRED_PUBLISH_SCOPES.get(platform.lower(), set())
        if not required:
            return True
            
        # Allow if generic "publish" scope is granted or exact platform scope is present
        if "publish" in granted_set or bool(required.intersection(granted_set)):
            return True
        return False

    @classmethod
    async def reconcile_publication(cls, platform: str, idempotency_key: str) -> Optional[Dict[str, Any]]:
        """
        Dispatches reconciliation lookup to platform publisher to establish external outcome
        without performing a blind retry or causing duplicate side effects.
        """
        pub = cls.get_publisher(platform)
        if hasattr(pub, "reconcile"):
            return await pub.reconcile(idempotency_key)
        return None

    @classmethod
    async def publish(
        cls,
        platform_name: str,
        account_id: Optional[str] = None,
        text: str = "",
        media_asset_ids: Optional[List[str]] = None,
        idempotency_key: Optional[str] = None,
        account: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Unified dispatch entrypoint for scheduled background workers and external automation.
        """
        pub = cls.get_publisher(platform_name)
        from app.storage.db import get_social_account, get_media_asset
        if not account and platform_name:
            account = get_social_account(platform_name)
        media_asset = None
        if media_asset_ids and len(media_asset_ids) > 0:
            media_asset = get_media_asset(media_asset_ids[0])
        return await pub.publish(
            account=account,
            content_text=text,
            cta=None,
            media_asset=media_asset,
            idempotency_key=idempotency_key
        )

    @classmethod
    def get_capabilities_matrix(cls) -> Dict[str, Any]:
        return {
            "linkedin": {
                "platform": "linkedin",
                "display_name": "LinkedIn",
                "api_type": "Posts API (/rest/posts)",
                "max_characters": 3000,
                "requires_media": False,
                "supports_video": True,
                "supports_images": True,
                "max_images": 9,
                "supported_mimes": ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime"]
            },
            "x": {
                "platform": "x",
                "display_name": "X (Twitter)",
                "api_type": "X API v2 (/2/tweets)",
                "max_characters": 280,
                "requires_media": False,
                "supports_video": True,
                "supports_images": True,
                "max_images": 4,
                "supported_mimes": ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"]
            },
            "instagram": {
                "platform": "instagram",
                "display_name": "Instagram",
                "api_type": "Instagram Graph API Container Workflow",
                "max_characters": 2200,
                "requires_media": True,
                "supports_video": True,
                "supports_images": True,
                "max_images": 10,
                "requires_public_https": True,
                "supported_mimes": ["image/jpeg", "image/png", "video/mp4", "video/quicktime"]
            },
            "youtube": {
                "platform": "youtube",
                "display_name": "YouTube Shorts & Videos",
                "api_type": "YouTube Data API v3 (videos/insert)",
                "max_characters": 5000,
                "requires_media": True,
                "supports_video": True,
                "supports_images": False,
                "max_images": 0,
                "requires_public_https": True,
                "supported_mimes": ["video/mp4", "video/quicktime"]
            }
        }

publisher_factory = PublisherFactory()

