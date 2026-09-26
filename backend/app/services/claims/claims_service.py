import logging
from typing import Dict, Any, List, Optional
from app.services.claims.evaluation_service import ClaimsEvaluationService
from app.services.audit.audit_ledger import AuditLedgerService
from app.services.audit.event_outbox import EventOutboxService

logger = logging.getLogger("claims_service")

class ClaimsService:
    """
    Authoritative Claims & Evidence Engine domain service.
    Orchestrates claim extraction, evidence binding, policy evaluation,
    and returns evaluation results to Domain Services (ContentService / ApprovalService).
    """
    def __init__(self, uow=None):
        self.uow = uow

    def process_content_version_claims(
        self,
        workspace_id: str,
        actor_id: str,
        content_version_id: str,
        content_body: str,
        claims: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        claims_list = claims or []
        eval_result = ClaimsEvaluationService.evaluate_version_content(content_body, claims_list)

        if self.uow and self.uow.in_transaction:
            AuditLedgerService.append_entry(
                self.uow,
                workspace_id=workspace_id,
                actor_id=actor_id,
                action="CLAIMS_EVALUATED",
                entity_type="CONTENT_VERSION",
                entity_id=content_version_id,
                payload=eval_result
            )
            EventOutboxService.emit_event(
                self.uow,
                workspace_id=workspace_id,
                event_type="CLAIMS_EVALUATED",
                aggregate_type="CONTENT_VERSION",
                aggregate_id=content_version_id,
                payload=eval_result
            )

        logger.info(f"Claims processed for version {content_version_id}: status={eval_result['claims_evaluation_status']}")
        return eval_result
