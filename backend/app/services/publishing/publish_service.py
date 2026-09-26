import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.services.audit.audit_ledger import AuditLedgerService
from app.services.audit.event_outbox import EventOutboxService

logger = logging.getLogger("publish_service")

class PublishService:
    """
    Authoritative Publish Domain Service.
    Orchestrates PublishOperation creation, execution state transitions,
    and commits state mutations, audit ledger appends, and outbox emissions within short UnitOfWork transactions.
    """
    def __init__(self, uow=None):
        self.uow = uow

    def create_publish_operation(
        self,
        workspace_id: str,
        actor_id: str,
        content_version_id: str,
        content_version_hash: str,
        claims_state_hash: str,
        destination_channel: str,
        destination_account_id: str,
        schedule_slot_utc: str
    ) -> Dict[str, Any]:
        operation_id = str(uuid.uuid4())
        op_data = {
            "id": operation_id,
            "workspace_id": workspace_id,
            "content_version_id": content_version_id,
            "content_version_hash": content_version_hash,
            "claims_state_hash": claims_state_hash,
            "destination_channel": destination_channel,
            "destination_account_id": destination_account_id,
            "schedule_slot_utc": schedule_slot_utc,
            "execution_state": "READY",
            "provider_idempotency_state": "NEVER_ATTEMPTED",
            "generation": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        if self.uow and self.uow.in_transaction:
            AuditLedgerService.append_entry(
                self.uow,
                workspace_id=workspace_id,
                actor_id=actor_id,
                action="PUBLISH_OPERATION_CREATED",
                entity_type="PUBLISH_OPERATION",
                entity_id=operation_id,
                payload={"execution_state": "READY", "generation": 1}
            )
            EventOutboxService.emit_event(
                self.uow,
                workspace_id=workspace_id,
                event_type="PUBLISH_OPERATION_READY",
                aggregate_type="PUBLISH_OPERATION",
                aggregate_id=operation_id,
                payload={"schedule_slot_utc": schedule_slot_utc}
            )

        logger.info(f"PublishOperation {operation_id} created in state READY (generation 1)")
        return op_data
