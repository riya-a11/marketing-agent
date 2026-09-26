import logging
import hashlib
from typing import Dict, Any, List
from app.services.claims.claims_policy import ClaimsPolicyEngine

logger = logging.getLogger("claims_evaluation_service")

class ClaimsEvaluationService:
    """
    Evaluates claims and evidence for a content version.
    AI / VLM / Rule evaluations return EvaluationResult object.
    Does NOT directly mutate DB state; returns structured evaluation result to ClaimsService.
    """
    @staticmethod
    def evaluate_version_content(content_body: str, claims: List[Dict[str, Any]]) -> Dict[str, Any]:
        content_hash = hashlib.sha256(content_body.encode("utf-8")).hexdigest()
        policy_result = ClaimsPolicyEngine.evaluate_claims(claims)

        return {
            "content_version_hash": content_hash,
            "claims_state_hash": policy_result["claims_state_hash"],
            "claims_evaluation_status": policy_result["claims_evaluation_status"],
            "violations": policy_result["violations"]
        }
