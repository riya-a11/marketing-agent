from typing import Dict, Any, List
from app.services.publishing.base import SocialPublisher
from app.services.publishing.linkedin import LinkedInPublisher
from app.services.publishing.x import XPublisher
from app.services.publishing.instagram import InstagramPublisher
from app.services.publishing.youtube import YouTubePublisher

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

