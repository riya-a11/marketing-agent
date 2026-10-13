import uuid
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import httpx

from app.services.publishing.base import SocialPublisher
from app.services.security.crypto import token_crypto
from app.config import settings

logger = logging.getLogger("instagram_publisher")

class InstagramPublisher(SocialPublisher):
    @property
    def platform_name(self) -> str:
        return "instagram"

    @property
    def max_characters(self) -> Optional[int]:
        return 2200

    @property
    def requires_media(self) -> bool:
        return True

    def is_live_configured(self, account: Optional[Dict[str, Any]]) -> bool:
        if account and (account.get("access_token_encrypted") or account.get("access_token")):
            return True
        return bool(settings.INSTAGRAM_APP_ID and settings.INSTAGRAM_APP_SECRET) or bool(settings.META_ACCESS_TOKEN)

    async def publish(
        self,
        account: Optional[Dict[str, Any]],
        content_text: str,
        cta: Optional[str] = None,
        media_asset: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        full_text = f"{content_text}\n\n{cta}".strip() if cta else content_text

        # 1. Instagram requires media attachment
        if not media_asset:
            raise ValueError("Instagram requires at least one image or video attachment to publish.")

        public_url = (media_asset.get("public_url") or "").strip()
        if not public_url:
            raise ValueError("Instagram media asset is missing a valid public URL.")

        # 2. Extract decrypted token & IG user ID
        raw_token = None
        if account:
            if account.get("access_token_encrypted"):
                try:
                    raw_token = token_crypto.decrypt_token(account["access_token_encrypted"])
                except Exception as e:
                    logger.warning(f"Could not decrypt Instagram access token: {e}")
            if not raw_token and account.get("access_token"):
                raw_token = account["access_token"]

        if not raw_token and settings.META_ACCESS_TOKEN:
            raw_token = settings.META_ACCESS_TOKEN

        ig_user_id = account.get("account_id") if account else None

        # Determine if we should perform live Graph API calls or simulated fallback
        is_live = False
        if account and account.get("provider_mode") == "live":
            if raw_token and not raw_token.startswith("sim_") and not raw_token.startswith("token_"):
                is_live = True
        elif raw_token and not raw_token.startswith("sim_") and not raw_token.startswith("token_") and settings.SOCIAL_PROVIDER_MODE.lower() == "live":
            is_live = True

        # Mode resolution based on settings and live status
        if not is_live and settings.ENVIRONMENT.lower() == "production" and settings.SOCIAL_PROVIDER_MODE.lower() == "live":
            raise ValueError("Live Instagram publishing failed: Missing valid connected Instagram account or decrypted access token.")

        # 3. Public HTTPS verification for live Instagram Graph API
        if is_live:
            if not public_url.lower().startswith("https://") or "127.0.0.1" in public_url or "localhost" in public_url:
                raise ValueError(
                    f"Instagram Graph API requires a publicly accessible HTTPS media URL. "
                    f"Current media URL '{public_url}' is not public HTTPS. "
                    f"Please host media on a public HTTPS URL or configure MEDIA_PUBLIC_BASE_URL."
                )

        is_video = "video" in media_asset.get("content_type", "").lower() or public_url.lower().endswith((".mp4", ".mov"))

        if is_live:
            logger.info(f"Instagram Graph API [LIVE]: Initiating container workflow for IG User {ig_user_id}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Step A: Create Media Container
                container_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media"
                container_payload = {
                    "caption": full_text,
                    "access_token": raw_token
                }
                if is_video:
                    container_payload["video_url"] = public_url
                    container_payload["media_type"] = "REELS"
                else:
                    container_payload["image_url"] = public_url

                res_container = await client.post(container_url, data=container_payload)
                c_json = res_container.json()

                if res_container.status_code not in (200, 201) or "error" in c_json:
                    err_info = c_json.get("error", {})
                    err_msg = err_info.get("message", res_container.text)
                    logger.error(f"Instagram container creation failed ({res_container.status_code}): {err_msg}")
                    raise RuntimeError(f"Instagram Graph API container creation failed: [{err_info.get('code', 'ERR')}] {err_msg}")

                creation_id = c_json.get("id")
                if not creation_id:
                    raise RuntimeError(f"Instagram Graph API returned no container ID: {c_json}")

                # Step B: Poll Container Status until FINISHED (for Reels/Videos or Image processing)
                status_code = "IN_PROGRESS"
                max_attempts = 20
                for attempt in range(max_attempts):
                    res_status = await client.get(
                        f"https://graph.facebook.com/v19.0/{creation_id}",
                        params={"fields": "status_code,status", "access_token": raw_token}
                    )
                    if res_status.status_code == 200:
                        s_data = res_status.json()
                        status_code = s_data.get("status_code", "FINISHED")
                        if status_code == "FINISHED":
                            break
                        elif status_code == "ERROR":
                            err_detail = s_data.get("status", "Processing error")
                            logger.error(f"Instagram container processing failed: {err_detail}")
                            raise RuntimeError(f"Instagram media container processing failed: {err_detail}")
                    await asyncio.sleep(3)

                # Step C: Publish Media Container
                publish_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish"
                res_pub = await client.post(
                    publish_url,
                    data={"creation_id": creation_id, "access_token": raw_token}
                )
                p_json = res_pub.json()

                if res_pub.status_code not in (200, 201) or "error" in p_json:
                    err_info = p_json.get("error", {})
                    err_msg = err_info.get("message", res_pub.text)
                    logger.error(f"Instagram media_publish failed ({res_pub.status_code}): {err_msg}")
                    raise RuntimeError(f"Instagram Graph API media publish failed: [{err_info.get('code', 'ERR')}] {err_msg}")

                ig_media_id = p_json.get("id")
                if not ig_media_id:
                    raise RuntimeError(f"Instagram Graph API returned no published media ID: {p_json}")

                # Step D: Fetch Published Post Permalink
                permalink = f"https://www.instagram.com/p/{ig_media_id}/"
                try:
                    res_link = await client.get(
                        f"https://graph.facebook.com/v19.0/{ig_media_id}",
                        params={"fields": "id,permalink,username", "access_token": raw_token}
                    )
                    if res_link.status_code == 200:
                        link_json = res_link.json()
                        permalink = link_json.get("permalink", permalink)
                except Exception as pe:
                    logger.warning(f"Could not fetch exact permalink for IG post {ig_media_id}: {pe}")

                return {
                    "status": "published",
                    "platform": "instagram",
                    "external_post_id": str(ig_media_id),
                    "permalink": permalink,
                    "channel_name": "Instagram Graph API",
                    "provider_mode": "live",
                    "container_id": creation_id,
                    "request_payload": container_payload,
                    "response_status": 200,
                    "response_body": {
                        "id": str(ig_media_id),
                        "permalink": permalink,
                        "provider_mode": "live"
                    }
                }

        # Simulated fallback mode (active when SOCIAL_PROVIDER_MODE='mock' or in test mode without live token)
        logger.info(f"Instagram Graph API [SIMULATED ADAPTER]: Executing container lifecycle for IG User {ig_user_id or 'simulated'}")
        creation_id = f"container_{uuid.uuid4().hex[:10]}"
        post_uid = uuid.uuid4().hex[:11]
        ig_media_id = f"ig_{int(datetime.utcnow().timestamp())}"
        permalink = f"https://www.instagram.com/p/{post_uid}/"
        container_payload = {
            ("video_url" if is_video else "image_url"): public_url,
            "caption": full_text,
            "media_type": "REELS" if is_video else "IMAGE"
        }

        return {
            "status": "published",
            "platform": "instagram",
            "external_post_id": ig_media_id,
            "permalink": permalink,
            "channel_name": "Instagram Graph API Container (Simulated)",
            "provider_mode": "simulated",
            "container_id": creation_id,
            "request_payload": container_payload,
            "response_status": 200,
            "response_body": {
                "id": ig_media_id,
                "permalink": permalink,
                "provider_mode": "simulated"
            }
        }
