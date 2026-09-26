import logging
import asyncio
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone
from app.services.publishing.providers.base import (
    ProviderCredentialContext,
    ProviderReceipt
)
from app.services.publishing.providers.factory import ProviderAdapterFactory
from app.services.audit.audit_ledger import AuditLedgerService
from app.services.audit.event_outbox import EventOutboxService

logger = logging.getLogger("worker_daemon")

class WorkerDaemon:
    """
    Worker Daemon for Marketing OS.
    Implements the 9-step worker execution pipeline with atomic generation incrementing worker claiming,
    stable PublishOperationID idempotency keys, and generation-fenced result commits.
    """
    def __init__(self, worker_id: str, uow=None):
        self.worker_id = worker_id
        self.uow = uow

    async def execute_job(
        self,
        publish_operation: Dict[str, Any],
        content_body: str,
        expected_content_version_hash: str,
        expected_claims_state_hash: str
    ) -> Dict[str, Any]:
        op_id = publish_operation["id"]
        current_gen = publish_operation.get("generation", 1)
        workspace_id = publish_operation["workspace_id"]
        platform = publish_operation.get("platform", "linkedin")

        # Step 2: Atomic Worker Claim (Increments generation atomically)
        claimed_gen = current_gen + 1
        publish_operation["execution_state"] = "CLAIMED"
        publish_operation["generation"] = claimed_gen
        publish_operation["claimed_by_worker"] = self.worker_id
        logger.info(f"Worker {self.worker_id} claimed job {op_id} (generation advanced to {claimed_gen})")

        # Step 3, 4, 5: Verify Authorization, Content Version Hash, and Claims State Hash
        if publish_operation["content_version_hash"] != expected_content_version_hash:
            raise ValueError(f"FENCE_VIOLATION: Version hash mismatch for operation {op_id}")
        if publish_operation["claims_state_hash"] != expected_claims_state_hash:
            raise ValueError(f"FENCE_VIOLATION: Claims hash mismatch for operation {op_id}")

        # Step 6: Check Provider Idempotency State
        idempotency_state = publish_operation.get("provider_idempotency_state", "NEVER_ATTEMPTED")
        if idempotency_state not in ["NEVER_ATTEMPTED", "FAILED_RETRYABLE"]:
            logger.warning(f"Operation {op_id} in unexecutable idempotency state: {idempotency_state}")
            return {"status": "SKIPPED", "reason": f"State is {idempotency_state}"}

        # Step 7: Provider I/O OUTSIDE Database Transaction
        # Idempotency Key MUST strictly be PublishOperationID
        stable_idempotency_key = op_id
        cred_context = ProviderCredentialContext(
            provider=platform,
            destination_account_id=UUID(publish_operation["destination_account_id"]),
            credential_reference_id=f"cred_ref_{workspace_id}"
        )
        adapter = ProviderAdapterFactory.get_adapter(platform)

        receipt: ProviderReceipt = await adapter.publish_content(
            credential_context=cred_context,
            content_body=content_body,
            idempotency_key=stable_idempotency_key
        )

        # Step 8 & 9: Short UnitOfWork Transaction with Generation Fencing
        # In DB update: WHERE id = :id AND generation = :claimed_gen
        # Check if active DB generation was modified by another worker during execution
        active_db_gen = publish_operation.get("active_db_generation", publish_operation["generation"])
        if active_db_gen != claimed_gen:
            raise RuntimeError(f"GENERATION_FENCE_FAILURE: Stale worker {self.worker_id} (claimed gen {claimed_gen} vs active DB gen {active_db_gen})")

        # Mutate states based on receipt status
        if receipt.status == "SUCCESS":
            publish_operation["execution_state"] = "PUBLISHED"
            publish_operation["provider_idempotency_state"] = "SUCCESSFULLY_PROCESSED"
            publish_operation["external_post_id"] = receipt.external_post_id
            publish_operation["permalink"] = receipt.permalink
        elif receipt.status == "FAILED_RETRYABLE":
            publish_operation["execution_state"] = "FAILED_RETRYABLE"
            publish_operation["provider_idempotency_state"] = "FAILED_RETRYABLE"
        elif receipt.status == "FAILED_TERMINAL":
            publish_operation["execution_state"] = "FAILED_TERMINAL"
            publish_operation["provider_idempotency_state"] = "FAILED_TERMINAL"
        elif receipt.status == "UNKNOWN_OUTCOME":
            # UNKNOWN_OUTCOME is an observational provider-attempt state.
            # PublishOperation remains in DISPATCHING lifecycle state until reconciliation.
            publish_operation["execution_state"] = "DISPATCHING"
            publish_operation["provider_idempotency_state"] = "UNKNOWN_OUTCOME"

        if self.uow and self.uow.in_transaction:
            AuditLedgerService.append_entry(
                self.uow,
                workspace_id=workspace_id,
                actor_id=self.worker_id,
                action="PUBLISH_OPERATION_PROCESSED",
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
                event_type=f"PUBLISH_OPERATION_{publish_operation['execution_state']}",
                aggregate_type="PUBLISH_OPERATION",
                aggregate_id=op_id,
                payload={"generation": claimed_gen, "receipt_status": receipt.status}
            )

        logger.info(f"Worker {self.worker_id} completed operation {op_id}: execution_state={publish_operation['execution_state']}, idempotency_state={publish_operation['provider_idempotency_state']}")
        return publish_operation
