import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger("event_outbox")

class EventOutboxService:
    """
    Reliable Event Outbox delivery engine.
    Emits outbox records within the Unit of Work database transaction.
    Post-commit, Outbox Dispatcher consumes outbox events as a notification/trigger signal
    to wake Publish Execution Service, which enforces PublishOperation execution-claim fencing,
    cryptographic authorization, and provider idempotency before calling provider APIs.
    """
    @staticmethod
    def emit_event(
        uow,
        workspace_id: str,
        event_type: str,
        aggregate_type: str,
        aggregate_id: str,
        payload: Dict[str, Any]
    ) -> dict:
        outbox_record = {
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "event_type": event_type,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "payload": payload,
            "status": "PENDING",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        uow.add_outbox_record(outbox_record)
        logger.info(f"Outbox event emitted: {event_type} for {aggregate_type}:{aggregate_id}")
        return outbox_record
