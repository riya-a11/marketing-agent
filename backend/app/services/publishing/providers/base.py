from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class ProviderCredentialContext(BaseModel):
    provider: str
    destination_account_id: UUID
    credential_reference_id: str
    # Access tokens are strictly excluded from DTO serialization.
    # Resolved inside provider boundary via SecureCredentialResolver.

class PublicationIdentity(BaseModel):
    publish_operation_id: UUID
    provider_request_id: Optional[str] = None
    external_post_id: Optional[str] = None
    channel: str
    destination_account_id: UUID
    content_version_hash: str
    scheduled_at: datetime

class ProviderReceipt(BaseModel):
    status: Literal["SUCCESS", "FAILED_RETRYABLE", "FAILED_TERMINAL", "UNKNOWN_OUTCOME"]
    platform: str
    external_post_id: Optional[str] = None
    permalink: Optional[str] = None
    provider_request_id: Optional[str] = None
    http_status_code: int
    normalized_error_code: Optional[str] = None
    sanitized_metadata: Dict[str, Any]

class MarketingOSProviderInterface(ABC):
    @property
    @abstractmethod
    def platform_name(self) -> str:
        pass

    @abstractmethod
    async def publish_content(
        self,
        credential_context: ProviderCredentialContext,
        content_body: str,
        media_assets: Optional[list] = None,
        idempotency_key: str = None  # Must be PublishOperationID
    ) -> ProviderReceipt:
        pass

    @abstractmethod
    async def reconcile_publication(
        self,
        credential_context: ProviderCredentialContext,
        identity: PublicationIdentity
    ) -> ProviderReceipt:
        """
        Polls provider status for UNKNOWN_OUTCOME operations using publication identity.
        """
        pass
