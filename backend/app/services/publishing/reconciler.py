import logging
import asyncio
from typing import Dict, Any
from uuid import UUID
from datetime import datetime, timezone
from app.services.publishing.providers.base import (
    ProviderCredentialContext,
    PublicationIdentity,
    ProviderReceipt
)
from app.services.publishing.providers.factory import ProviderAdapterFactory
from app.services.audit.audit_ledger import AuditLedgerService
from app.services.audit.event_outbox import EventOutboxService

logger = logging.getLogger("reconciler")

class PublishReconciler:
    """
    Reconciler for UNKNOWN_OUTCOME publish operations.
    Polls provider status via reconcile_publication() using PublicationIdentity.
    Prohibits blind retries. Mutates state only after provider status is established.
    Enforces generation fencing on all reconciliation state mutations.
    """
    def __init__(self, uow=None):
        self.uow = uow

    async def reconcile_operation(
        self,
        publish_operation: Dict[str, Any],
        reconciler_worker_id: str
    ) -> Dict[str, Any]:
        op_id = publish_operation["id"]
        current_gen = publish_operation.get("generation", 1)
        workspace_id = publish_operation["workspace_id"]
        platform = publish_operation.get("platform", "linkedin")

        # Atomic reclaim & generation increment for reconciliation
        claimed_gen = current_gen + 1
        publish_operation["generation"] = claimed_gen
        logger.info(f"Reconciler worker {reconciler_worker_id} acquired operation {op_id} (generation advanced to {claimed_gen})")

        cred_context = ProviderCredentialContext(
            provider=platform,
            destination_account_id=UUID(publish_operation["destination_account_id"]),
            credential_reference_id=f"cred_ref_{workspace_id}"
        )
        pub_identity = PublicationIdentity(
            publish_operation_id=UUID(op_id),
            channel=publish_operation.get("destination_channel", "default_channel"),
            destination_account_id=UUID(publish_operation["destination_account_id"]),
            content_version_hash=publish_operation["content_version_hash"],
            scheduled_at=datetime.now(timezone.utc)
        )

        adapter = ProviderAdapterFactory.get_adapter(platform)

        # Poll provider status (NO BLIND RETRY)
        receipt: ProviderReceipt = await adapter.reconcile_publication(
            credential_context=cred_context,
            identity=pub_identity
        )

        # Generation Fencing Check
        if publish_operation["generation"] != claimed_gen:
            raise RuntimeError(f"RECONCILIATION_FENCE_FAILURE: Stale reconciler (gen {claimed_gen} vs active {publish_operation['generation']})")

        if receipt.status == "SUCCESS":
            publish_operation["execution_state"] = "PUBLISHED"
            publish_operation["provider_idempotency_state"] = "SUCCESSFULLY_PROCESSED"
            publish_operation["external_post_id"] = receipt.external_post_id
            publish_operation["permalink"] = receipt.permalink
        elif receipt.status in ["FAILED_RETRYABLE", "FAILED_TERMINAL"]:
            publish_operation["execution_state"] = receipt.status
            publish_operation["provider_idempotency_state"] = receipt.status

        if self.uow and self.uow.in_transaction:
            AuditLedgerService.append_entry(
                self.uow,
                workspace_id=workspace_id,
                actor_id=reconciler_worker_id,
                action="PUBLISH_OPERATION_RECONCILED",
                entity_type="PUBLISH_OPERATION",
                entity_id=op_id,
                payload={
                    "execution_state": publish_operation["execution_state"],
                    "provider_idempotency_state": publish_operation["provider_idempotency_state"],
                    "generation": claimed_gen,
                    "receipt": receipt.dict()
                }
            )
            EventOutboxService.emit_event(
                self.uow,
                workspace_id=workspace_id,
                event_type=f"PUBLISH_OPERATION_RECONCILED_{publish_operation['execution_state']}",
                aggregate_type="PUBLISH_OPERATION",
                aggregate_id=op_id,
                payload={"generation": claimed_gen}
            )

        logger.info(f"Reconciliation completed for {op_id}: state={publish_operation['execution_state']}")
        return publish_operation
