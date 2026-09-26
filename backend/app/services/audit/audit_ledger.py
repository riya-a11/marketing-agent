import logging
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

logger = logging.getLogger("audit_ledger")

class AuditLedgerService:
    """
    Authoritative, append-only, immutable Audit Ledger service.
    Appends audit trail records within the Unit of Work database transaction.
    """
    @staticmethod
    def append_entry(
        uow=None,
        workspace_id: str = "00000000-0000-0000-0000-000000000001",
        actor_id: str = "usr_system",
        action: str = "UNKNOWN_ACTION",
        entity_type: str = "GENERIC_ENTITY",
        entity_id: str = "",
        entity_version: Optional[int] = 1,
        result: str = "SUCCESS",
        request_id: Optional[str] = None,
        job_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> dict:
        audit_record = {
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_version": entity_version,
            "result": result,
            "request_id": request_id or f"req_{uuid.uuid4().hex[:8]}",
            "job_id": job_id,
            "payload": payload or {},
            "ip_address": ip_address,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        if uow and hasattr(uow, "add_audit_record"):
            uow.add_audit_record(audit_record)
        else:
            try:
                from app.storage.db import get_connection
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO audit_ledger_entries (id, workspace_id, actor_id, action, entity_type, entity_id, entity_version, result, request_id, job_id, payload, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    audit_record["id"],
                    audit_record["workspace_id"],
                    audit_record["actor_id"],
                    audit_record["action"],
                    audit_record["entity_type"],
                    audit_record["entity_id"],
                    audit_record["entity_version"],
                    audit_record["result"],
                    audit_record["request_id"],
                    audit_record["job_id"],
                    json.dumps(audit_record["payload"]),
                    audit_record["ip_address"],
                    audit_record["created_at"]
                ))
                conn.commit()
                conn.close()
            except Exception as e:
                logger.warning(f"Could not persist audit record to database: {e}")

        logger.info(f"Audit record appended: [{action}] result={result} on {entity_type}:{entity_id} (v{entity_version}) by actor {actor_id}")
        return audit_record
