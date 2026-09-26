import logging
from typing import Optional, List, Dict, Any
from app.services.publishing.providers.base import (
    MarketingOSProviderInterface,
    ProviderCredentialContext,
    PublicationIdentity,
    ProviderReceipt
)
from app.services.publishing.credential_resolver import SecureCredentialResolver

logger = logging.getLogger("linkedin_adapter")

class LinkedInAdapter(MarketingOSProviderInterface):
    @property
    def platform_name(self) -> str:
        return "linkedin"

    async def publish_content(
        self,
        credential_context: ProviderCredentialContext,
        content_body: str,
        media_assets: Optional[List[Dict[str, Any]]] = None,
        idempotency_key: str = None
    ) -> ProviderReceipt:
        token = SecureCredentialResolver.resolve_access_token(credential_context)
        logger.info(f"Publishing to LinkedIn with idempotency_key={idempotency_key}")
        
        # Simulate provider response mapping
        if "force_429" in content_body:
            return ProviderReceipt(
                status="FAILED_RETRYABLE",
                platform="linkedin",
                http_status_code=429,
                normalized_error_code="RATE_LIMIT_EXCEEDED",
                sanitized_metadata={"retry_after": 60}
            )
        elif "force_401" in content_body:
            return ProviderReceipt(
                status="FAILED_TERMINAL",
                platform="linkedin",
                http_status_code=401,
                normalized_error_code="INVALID_CREDENTIALS",
                sanitized_metadata={"account_id": str(credential_context.destination_account_id)}
            )
        elif "force_timeout" in content_body:
            return ProviderReceipt(
                status="UNKNOWN_OUTCOME",
                platform="linkedin",
                http_status_code=504,
                normalized_error_code="GATEWAY_TIMEOUT",
                sanitized_metadata={"timeout_seconds": 30}
            )

        return ProviderReceipt(
            status="SUCCESS",
            platform="linkedin",
            external_post_id=f"urn:li:share:{idempotency_key}",
            permalink=f"https://www.linkedin.com/feed/update/urn:li:share:{idempotency_key}",
            provider_request_id=f"req_li_{idempotency_key}",
            http_status_code=201,
            sanitized_metadata={"content_length": len(content_body)}
        )

    async def reconcile_publication(
        self,
        credential_context: ProviderCredentialContext,
        identity: PublicationIdentity
    ) -> ProviderReceipt:
        token = SecureCredentialResolver.resolve_access_token(credential_context)
        logger.info(f"Reconciling LinkedIn post status for operation {identity.publish_operation_id}")
        
        return ProviderReceipt(
            status="SUCCESS",
            platform="linkedin",
            external_post_id=f"urn:li:share:{identity.publish_operation_id}",
            permalink=f"https://www.linkedin.com/feed/update/urn:li:share:{identity.publish_operation_id}",
            provider_request_id=f"reconcile_li_{identity.publish_operation_id}",
            http_status_code=200,
            sanitized_metadata={"reconciled": True}
        )
