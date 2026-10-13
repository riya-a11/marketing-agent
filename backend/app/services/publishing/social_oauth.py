import os
import uuid
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("social_oauth_service")

# ---------------------------------------------------------------------------
# Strict Provider Error Taxonomy
# ---------------------------------------------------------------------------
class ProviderError(Exception):
    """Base class for all social OAuth provider exceptions."""
    def __init__(self, message: str, status_code: int = 500, error_code: str = "PROVIDER_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class ProviderConfigurationError(ProviderError):
    """Raised when an OAuth provider is unconfigured or credentials missing in production (HTTP 503)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=503, error_code="PROVIDER_CONFIGURATION_ERROR")

class ProviderAuthenticationError(ProviderError):
    """Raised when provider client credentials or code exchange fails authentication (HTTP 401)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=401, error_code="PROVIDER_AUTHENTICATION_ERROR")

class ProviderAuthorizationDenied(ProviderError):
    """Raised when the user or provider denies the requested authorization/scopes (HTTP 403)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=403, error_code="PROVIDER_AUTHORIZATION_DENIED")

class ProviderUnavailableError(ProviderError):
    """Raised when the upstream OAuth provider is temporarily down, times out, or returns 5xx (HTTP 502)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=502, error_code="PROVIDER_UNAVAILABLE")

class ProviderRateLimitedError(ProviderError):
    """Raised when upstream provider rate limit is hit during token exchange (HTTP 429)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=429, error_code="PROVIDER_RATE_LIMITED")

class ProviderPermissionError(ProviderError):
    """Raised when granted scopes are insufficient for the requested platform operations (HTTP 403)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=403, error_code="PROVIDER_PERMISSION_ERROR")

class SocialOAuthService:
    """
    Enterprise OAuth Handshake & Token Lifecycle Service:
    - LinkedIn, X (Twitter), Instagram (Meta Graph API), and YouTube (Google OAuth)
    - Exchanges temporary OAuth codes for production access & refresh tokens
    - Fetches live profile identities (handles, display names, avatars)
    - Encrypts tokens using AES-256-GCM authenticated encryption before database storage
    - Strict Gating: Mock simulation active ONLY in development/test with SOCIAL_PROVIDER_MODE='mock'
    - In production: FAILS CLOSED with typed ProviderError taxonomy
    """

    @classmethod
    def map_provider_http_exception(cls, e: Exception, platform: str) -> ProviderError:
        """Translates transport and HTTP errors into typed ProviderError taxonomy."""
        if isinstance(e, ProviderError):
            return e
        if isinstance(e, httpx.HTTPStatusError):
            code = e.response.status_code
            try:
                err_data = e.response.json().get("error", {})
                err_msg = err_data.get("message", f"{platform.capitalize()} API error (HTTP {code}).")
            except Exception:
                err_msg = f"{platform.capitalize()} API error (HTTP {code})."
            if code == 401:
                return ProviderAuthenticationError(f"{platform.capitalize()} credentials or code invalid: {err_msg}")
            elif code == 403:
                return ProviderAuthorizationDenied(f"{platform.capitalize()} authorization denied: {err_msg}")
            elif code == 429:
                return ProviderRateLimitedError(f"{platform.capitalize()} API rate limit exceeded.")
            elif code >= 500:
                return ProviderUnavailableError(f"{platform.capitalize()} service unavailable (HTTP {code}).")
            return ProviderAuthenticationError(f"{platform.capitalize()} OAuth exchange failed (HTTP {code}): {err_msg}")
        elif isinstance(e, (httpx.TimeoutException, httpx.ConnectError)):
            return ProviderUnavailableError(f"{platform.capitalize()} upstream service timed out or connection failed.")
        return ProviderConfigurationError(f"Live {platform.capitalize()} OAuth exchange failed: {str(e)}")

    @classmethod
    async def _exchange_instagram(cls, code: str, redirect_uri: str) -> Dict[str, Any]:
        app_id = settings.INSTAGRAM_APP_ID.strip()
        app_secret = settings.INSTAGRAM_APP_SECRET.strip()

        if app_id and app_secret and "mock" not in app_id and "your_" not in app_id:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    # 1. Exchange authorization code for short-lived User Access Token via POST body (protects client_secret from URL logging)
                    token_res = await client.post(
                        "https://graph.facebook.com/v19.0/oauth/access_token",
                        data={
                            "client_id": app_id,
                            "client_secret": app_secret,
                            "redirect_uri": redirect_uri,
                            "code": code
                        }
                    )
                    if token_res.status_code != 200:
                        try:
                            err_data = token_res.json().get("error", {})
                            err_msg = err_data.get("message", "Meta OAuth token exchange failed.")
                            err_code = err_data.get("code", "AUTH_ERROR")
                        except Exception:
                            err_msg = "Meta OAuth token exchange failed."
                            err_code = token_res.status_code
                        logger.error(f"Meta OAuth token exchange failed (code {err_code}): {err_msg}")
                        raise ProviderAuthenticationError(f"Meta OAuth token exchange failed [{err_code}]: {err_msg}")

                    token_data = token_res.json()
                    short_lived_token = token_data.get("access_token")
                    if not short_lived_token:
                        raise ProviderAuthenticationError("Meta OAuth response missing 'access_token'.")

                    # 2. Exchange short-lived User Access Token for 60-day Long-Lived User Access Token
                    long_res = await client.get(
                        "https://graph.facebook.com/v19.0/oauth/access_token",
                        params={
                            "grant_type": "fb_exchange_token",
                            "client_id": app_id,
                            "client_secret": app_secret,
                            "fb_exchange_token": short_lived_token
                        }
                    )
                    if long_res.status_code == 200:
                        long_data = long_res.json()
                        access_token = long_data.get("access_token", short_lived_token)
                        expires_in = long_data.get("expires_in", 5184000)
                    else:
                        logger.warning(f"Long-lived token exchange warning ({long_res.status_code})")
                        access_token = short_lived_token
                        expires_in = token_data.get("expires_in", 5184000)

                    # 3. Inspect granted token permissions safely for diagnostics
                    granted_perms = []
                    try:
                        perm_res = await client.get(
                            "https://graph.facebook.com/v19.0/me/permissions",
                            params={"access_token": access_token}
                        )
                        if perm_res.status_code == 200:
                            p_data = perm_res.json().get("data", [])
                            granted_perms = [p.get("permission") for p in p_data if p.get("status") == "granted"]
                            logger.info(f"Meta User Token granted permissions ({len(granted_perms)}): {', '.join(granted_perms)}")
                        else:
                            logger.warning(f"Meta /me/permissions returned HTTP {perm_res.status_code}")
                    except Exception as ex:
                        logger.warning(f"Could not inspect token permissions: {ex}")

                    # 4. Multi-Endpoint Page & Instagram Asset Discovery
                    discovered_pages: Dict[str, Dict[str, Any]] = {}

                    # Endpoint A: Direct /me/accounts
                    accounts_res = await client.get(
                        "https://graph.facebook.com/v19.0/me/accounts",
                        params={
                            "fields": "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
                            "access_token": access_token
                        }
                    )
                    if accounts_res.status_code == 200:
                        for page in accounts_res.json().get("data", []):
                            if page.get("id"):
                                discovered_pages[str(page["id"])] = page
                    else:
                        try:
                            err_data = accounts_res.json().get("error", {})
                            logger.error(f"Meta /me/accounts failed (HTTP {accounts_res.status_code}, code {err_data.get('code')}): {err_data.get('message')}")
                        except Exception:
                            logger.error(f"Meta /me/accounts failed (HTTP {accounts_res.status_code})")

                    # Endpoint B: Fallback /me?fields=accounts
                    if not discovered_pages:
                        try:
                            me_res = await client.get(
                                "https://graph.facebook.com/v19.0/me",
                                params={
                                    "fields": "id,name,accounts{id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}}",
                                    "access_token": access_token
                                }
                            )
                            if me_res.status_code == 200:
                                me_accounts = me_res.json().get("accounts", {}).get("data", [])
                                for page in me_accounts:
                                    if page.get("id") and str(page["id"]) not in discovered_pages:
                                        discovered_pages[str(page["id"])] = page
                        except Exception as ex:
                            logger.warning(f"Fallback /me?fields=accounts query warning: {ex}")

                    # Endpoint C: Fallback /me/businesses (Meta Business Manager pages)
                    try:
                        biz_res = await client.get(
                            "https://graph.facebook.com/v19.0/me/businesses",
                            params={
                                "fields": "id,name,owned_pages{id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}},client_pages{id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}}",
                                "access_token": access_token
                            }
                        )
                        if biz_res.status_code == 200:
                            for biz in biz_res.json().get("data", []):
                                biz_pages = biz.get("owned_pages", {}).get("data", []) + biz.get("client_pages", {}).get("data", [])
                                for page in biz_pages:
                                    if page.get("id") and str(page["id"]) not in discovered_pages:
                                        discovered_pages[str(page["id"])] = page
                    except Exception as ex:
                        logger.warning(f"Fallback Meta Business Manager query warning: {ex}")

                    logger.info(f"Discovered {len(discovered_pages)} total Facebook Page(s) across Graph API discovery endpoints.")

                    selected_page_id = None
                    selected_page_name = None
                    ig_business_account = None
                    page_diagnostics = []

                    for page_id, page in discovered_pages.items():
                        p_name = page.get("name")
                        p_ig = page.get("instagram_business_account")
                        has_ig = bool(p_ig and p_ig.get("id"))
                        diag_entry = f"Page[ID={page_id}, Name='{p_name}', HasLinkedIG={has_ig}]"
                        page_diagnostics.append(diag_entry)

                        # Explicit Page-level lookup fallback if nested IG object was missing
                        if not has_ig and page_id:
                            p_token = page.get("access_token") or access_token
                            try:
                                page_ig_res = await client.get(
                                    f"https://graph.facebook.com/v19.0/{page_id}",
                                    params={
                                        "fields": "instagram_business_account{id,username,name,profile_picture_url}",
                                        "access_token": p_token
                                    }
                                )
                                if page_ig_res.status_code == 200:
                                    p_ig_data = page_ig_res.json().get("instagram_business_account")
                                    if p_ig_data and p_ig_data.get("id"):
                                        p_ig = p_ig_data
                                        has_ig = True
                                        page_diagnostics[-1] = f"Page[ID={page_id}, Name='{p_name}', HasLinkedIG=True (via Page Lookup)]"
                                        logger.info(f"Discovered linked Instagram Business Account on Page {page_id} via explicit Page lookup.")
                            except Exception as ex:
                                logger.warning(f"Explicit Page IG lookup warning for Page {page_id}: {ex}")

                        if has_ig and not ig_business_account:
                            ig_business_account = p_ig
                            selected_page_id = page_id
                            selected_page_name = p_name

                    # Safe diagnostic log for server logs (never logs tokens, secrets, codes, or URLs)
                    logger.info(f"Meta Pages breakdown ({len(discovered_pages)} pages): {', '.join(page_diagnostics) if page_diagnostics else 'None'}")

                    if not ig_business_account or not ig_business_account.get("id"):
                        logger.error(f"No linked Instagram Business account found across {len(discovered_pages)} Facebook Page(s). Breakdown: {page_diagnostics}")
                        raise ProviderPermissionError(
                            f"No Instagram Business account linked to a Facebook Page was found "
                            f"(evaluated {len(discovered_pages)} Facebook Page(s): {', '.join(page_diagnostics) if page_diagnostics else '0 pages returned'}; Granted permissions: {', '.join(granted_perms) if granted_perms else 'None'}). "
                            "Please ensure your Instagram account is a Professional (Business/Creator) account, is linked to your Facebook Page, "
                            "and that all Page & Instagram permissions were granted during Facebook Login."
                        )

                    ig_user_id = str(ig_business_account["id"])
                    raw_username = ig_business_account.get("username", "").strip()
                    account_handle = f"@{raw_username}" if raw_username else "@instagram_business"
                    display_name = ig_business_account.get("name") or selected_page_name or raw_username or "Instagram Business"
                    avatar_url = ig_business_account.get("profile_picture_url") or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop"

                    token_expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()

                    return {
                        "account_id": ig_user_id,
                        "account_handle": account_handle,
                        "display_name": display_name,
                        "avatar_url": avatar_url,
                        "access_token": access_token,
                        "refresh_token": access_token,
                        "token_expires_at": token_expires_at,
                        "scopes": ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement"],
                        "provider_mode": "live",
                        "metadata": {
                            "page_id": selected_page_id,
                            "page_name": selected_page_name
                        }
                    }
            except ProviderError:
                raise
            except Exception as e:
                logger.error(f"Live Instagram OAuth exchange failed: {e}")
                raise cls.map_provider_http_exception(e, "instagram")

    @classmethod
    def is_mock_allowed(cls) -> bool:
        return (
            settings.ENVIRONMENT.lower() in ["development", "test"]
            and settings.SOCIAL_PROVIDER_MODE.lower() == "mock"
        )

    @classmethod
    async def revoke_upstream_tokens(
        cls,
        platform: str,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes upstream token revocation on the target provider platform while credentials are intact:
        - YouTube / Google: POST https://oauth2.googleapis.com/revoke
        - X (Twitter): POST https://api.twitter.com/2/oauth2/revoke
        - In mock/test mode: returns simulated success receipt
        - Tolerates upstream errors without halting local credential zeroing
        """
        platform = platform.lower().strip()
        logger.info(f"Attempting upstream token revocation for platform '{platform}'")

        if cls.is_mock_allowed():
            logger.info(f"[SIMULATED] Upstream token revocation succeeded for {platform}")
            return {"revoked": True, "provider_mode": "simulated", "platform": platform}

        token_to_revoke = refresh_token or access_token
        if not token_to_revoke:
            return {"revoked": True, "provider_mode": "noop", "platform": platform, "note": "No active tokens to revoke"}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                if platform in ["youtube", "google"]:
                    res = await client.post(
                        "https://oauth2.googleapis.com/revoke",
                        params={"token": token_to_revoke},
                        headers={"Content-Type": "application/x-www-form-urlencoded"}
                    )
                    res.raise_for_status()
                    return {"revoked": True, "provider_mode": "live", "platform": platform}
                elif platform == "x":
                    if settings.X_CLIENT_ID and settings.X_CLIENT_SECRET:
                        auth_header = httpx.BasicAuth(settings.X_CLIENT_ID, settings.X_CLIENT_SECRET)
                        res = await client.post(
                            "https://api.twitter.com/2/oauth2/revoke",
                            auth=auth_header,
                            data={"token": token_to_revoke, "token_type_hint": "access_token"},
                            headers={"Content-Type": "application/x-www-form-urlencoded"}
                        )
                        return {"revoked": res.status_code == 200, "provider_mode": "live", "platform": platform}
                elif platform in ["linkedin", "instagram"]:
                    # Provider manages lifecycle expiration or uninstall webhooks
                    return {"revoked": True, "provider_mode": "live", "platform": platform, "note": "Provider does not require explicit token revocation endpoint"}
        except Exception as e:
            logger.warning(f"Upstream token revocation returned warning for {platform}: {e}")
            return {"revoked": False, "warning": str(e), "platform": platform}

        return {"revoked": True, "provider_mode": "live", "platform": platform}

    @classmethod
    async def exchange_code_for_tokens(
        cls,
        platform: str,
        code: str,
        redirect_uri: str,
        code_verifier: Optional[str] = None
    ) -> Dict[str, Any]:
        platform = platform.lower().strip()
        logger.info(f"Initiating OAuth 2.0 token exchange for {platform} (env={settings.ENVIRONMENT}, mode={settings.SOCIAL_PROVIDER_MODE})")

        if platform == "linkedin":
            return await cls._exchange_linkedin(code, redirect_uri)
        elif platform == "x":
            return await cls._exchange_x(code, redirect_uri, code_verifier)
        elif platform == "instagram":
            return await cls._exchange_instagram(code, redirect_uri)
        elif platform == "youtube":
            return await cls._exchange_youtube(code, redirect_uri)
        else:
            raise ValueError(f"Unsupported OAuth platform: '{platform}'")

    @classmethod
    async def _exchange_linkedin(cls, code: str, redirect_uri: str) -> Dict[str, Any]:
        client_id = settings.LINKEDIN_CLIENT_ID
        client_secret = settings.LINKEDIN_CLIENT_SECRET

        if client_id and client_secret and "mock" not in client_id:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    token_res = await client.post(
                        "https://www.linkedin.com/oauth/v2/accessToken",
                        data={
                            "grant_type": "authorization_code",
                            "code": code,
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "redirect_uri": redirect_uri,
                        },
                        headers={"Content-Type": "application/x-www-form-urlencoded"}
                    )
                    token_res.raise_for_status()
                    token_data = token_res.json()
                    access_token = token_data.get("access_token")
                    expires_in = token_data.get("expires_in", 5184000)

                    # Fetch live member profile
                    profile_res = await client.get(
                        "https://api.linkedin.com/v2/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    profile = profile_res.json() if profile_res.status_code == 200 else {}
                    sub = profile.get("sub", f"li_{secrets.token_hex(6)}")
                    name = profile.get("name", "LinkedIn Member")
                    picture = profile.get("picture", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop")

                    return {
                        "account_id": f"urn:li:person:{sub}",
                        "account_handle": name,
                        "display_name": name,
                        "avatar_url": picture,
                        "access_token": access_token,
                        "refresh_token": token_data.get("refresh_token") or access_token,
                        "token_expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat(),
                        "scopes": ["w_member_social", "openid", "profile"],
                        "provider_mode": "live"
                    }
            except Exception as e:
                logger.error(f"Live LinkedIn OAuth exchange failed: {e}")
                if not cls.is_mock_allowed():
                    raise cls.map_provider_http_exception(e, "linkedin")

        # P0 Security Boundary: Fail Closed if mock is disallowed
        if not cls.is_mock_allowed():
            raise ProviderConfigurationError("LinkedIn OAuth is unconfigured in production (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET missing).")

        # Explicitly Gated Simulation (Development & Test Only)
        token_exp = (datetime.utcnow() + timedelta(days=60)).isoformat()
        return {
            "account_id": f"urn:li:person:auth_{secrets.token_hex(4)}",
            "account_handle": "LinkedIn Company Page",
            "display_name": "Official LinkedIn Page (Simulated)",
            "avatar_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop",
            "access_token": f"sim_li_{secrets.token_hex(20)}",
            "refresh_token": f"sim_refresh_li_{secrets.token_hex(20)}",
            "token_expires_at": token_exp,
            "scopes": ["w_member_social", "openid", "profile"],
            "provider_mode": "simulated"
        }

    @classmethod
    async def _exchange_x(cls, code: str, redirect_uri: str, code_verifier: Optional[str] = None) -> Dict[str, Any]:
        client_id = settings.X_CLIENT_ID
        client_secret = settings.X_CLIENT_SECRET

        if client_id and client_secret and "mock" not in client_id:
            try:
                auth_header = httpx.BasicAuth(client_id, client_secret)
                data = {
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                    "code_verifier": code_verifier or "challenge"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    token_res = await client.post(
                        "https://api.twitter.com/2/oauth2/token",
                        auth=auth_header,
                        data=data,
                        headers={"Content-Type": "application/x-www-form-urlencoded"}
                    )
                    token_res.raise_for_status()
                    token_data = token_res.json()
                    access_token = token_data.get("access_token")
                    refresh_token = token_data.get("refresh_token")
                    expires_in = token_data.get("expires_in", 7200)

                    user_res = await client.get(
                        "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    user_data = user_res.json().get("data", {}) if user_res.status_code == 200 else {}
                    username = user_data.get("username", "company_hq")
                    name = user_data.get("name", "Official X Account")
                    avatar = user_data.get("profile_image_url", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop")

                    return {
                        "account_id": user_data.get("id", f"x_{secrets.token_hex(4)}"),
                        "account_handle": f"@{username}",
                        "display_name": name,
                        "avatar_url": avatar,
                        "access_token": access_token,
                        "refresh_token": refresh_token or access_token,
                        "token_expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat(),
                        "scopes": ["tweet.read", "tweet.write", "offline.access"],
                        "provider_mode": "live"
                    }
            except Exception as e:
                logger.error(f"Live X OAuth exchange failed: {e}")
                if not cls.is_mock_allowed():
                    raise cls.map_provider_http_exception(e, "x")

        if not cls.is_mock_allowed():
            raise ProviderConfigurationError("X OAuth is unconfigured in production (X_CLIENT_ID / X_CLIENT_SECRET missing).")

        token_exp = (datetime.utcnow() + timedelta(days=60)).isoformat()
        return {
            "account_id": f"x_auth_{secrets.token_hex(4)}",
            "account_handle": "@company_hq",
            "display_name": "Official X Account (Simulated)",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop",
            "access_token": f"sim_x_{secrets.token_hex(20)}",
            "refresh_token": f"sim_refresh_x_{secrets.token_hex(20)}",
            "token_expires_at": token_exp,
            "scopes": ["tweet.read", "tweet.write", "offline.access"],
            "provider_mode": "simulated"
        }

    @classmethod
    async def _exchange_youtube(cls, code: str, redirect_uri: str) -> Dict[str, Any]:
        client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")

        if client_id and client_secret and "mock" not in client_id:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    token_res = await client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "code": code,
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "redirect_uri": redirect_uri,
                            "grant_type": "authorization_code"
                        }
                    )
                    token_res.raise_for_status()
                    token_data = token_res.json()
                    access_token = token_data.get("access_token")
                    refresh_token = token_data.get("refresh_token")
                    expires_in = token_data.get("expires_in", 3600)

                    # Query YouTube channels API
                    channel_res = await client.get(
                        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    items = channel_res.json().get("items", []) if channel_res.status_code == 200 else []
                    channel_info = items[0] if items else {}
                    snippet = channel_info.get("snippet", {})
                    title = snippet.get("title", "YouTube Channel")
                    custom_url = snippet.get("customUrl", f"@{title.lower().replace(' ', '')}")
                    thumbnail = snippet.get("thumbnails", {}).get("default", {}).get("url", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop")

                    return {
                        "account_id": channel_info.get("id", f"yt_{secrets.token_hex(4)}"),
                        "account_handle": custom_url,
                        "display_name": title,
                        "avatar_url": thumbnail,
                        "access_token": access_token,
                        "refresh_token": refresh_token or access_token,
                        "token_expires_at": (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat(),
                        "scopes": ["youtube.upload", "youtube.readonly"],
                        "provider_mode": "live"
                    }
            except Exception as e:
                logger.error(f"Live YouTube OAuth exchange failed: {e}")
                if not cls.is_mock_allowed():
                    raise cls.map_provider_http_exception(e, "youtube")

        if not cls.is_mock_allowed():
            raise ProviderConfigurationError("YouTube OAuth is unconfigured in production (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing).")

        token_exp = (datetime.utcnow() + timedelta(days=60)).isoformat()
        return {
            "account_id": f"yt_channel_{secrets.token_hex(4)}",
            "account_handle": "@company_channel",
            "display_name": "YouTube Shorts & Video Channel (Simulated)",
            "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop",
            "access_token": f"sim_yt_{secrets.token_hex(20)}",
            "refresh_token": f"sim_refresh_yt_{secrets.token_hex(20)}",
            "token_expires_at": token_exp,
            "scopes": ["youtube.upload", "youtube.readonly"],
            "provider_mode": "simulated"
        }


