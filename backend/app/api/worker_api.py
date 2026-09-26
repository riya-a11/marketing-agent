import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.middleware.security import get_authenticated_worker_id

logger = logging.getLogger("worker_api")

router = APIRouter(prefix="/publish-operations", tags=["Internal Worker Control Plane"])

class ClaimRequest(BaseModel):
    requested_lease_seconds: int = 60

class DispatchRequest(BaseModel):
    execution_claim_id: str

@router.post("/claim")
def claim_publish_operation(
    req: ClaimRequest,
    worker_id: str = Depends(get_authenticated_worker_id)
):
    """
    POST /internal/v1/publish-operations/claim (TR-10)
    Internal worker claim execution endpoint.
    Derives worker_id strictly from authenticated mTLS cert / Worker JWT.
    """
    if req.requested_lease_seconds < 30 or req.requested_lease_seconds > 300:
        raise HTTPException(status_code=400, detail="400 INVALID_LEASE_DURATION: Lease must be between 30 and 300 seconds.")

    return {
        "workspace_id": "00000000-0000-0000-0000-000000000001",
        "approval_id": "appr_claim_123",
        "content_version_id": "cv_claim_123",
        "content_version_hash": "hash_123",
        "claims_state_hash": "claims_hash_123",
        "destination_channel": "00000000-0000-0000-0000-000000000002",
        "destination_account": "00000000-0000-0000-0000-000000000003",
        "schedule_slot_utc": "2026-09-12T18:00:00Z",
        "approval_policy_version": "v1.0-locked",
        "execution_claim_id": f"claim_{worker_id}_999",
        "claimed_by_worker": worker_id,
        "lease_expires_at": "2026-09-12T18:05:00Z"
    }

@router.post("/{operation_id}/dispatch")
def dispatch_publish_operation(
    operation_id: str,
    req: DispatchRequest,
    worker_id: str = Depends(get_authenticated_worker_id)
):
    """
    POST /internal/v1/publish-operations/{id}/dispatch (TR-11)
    """
    return {
        "operation_id": operation_id,
        "status": "DISPATCHING",
        "execution_claim_id": req.execution_claim_id,
        "dispatched_by_worker": worker_id
    }
