# Auto-generated Pydantic models from openapi_v1.0_final.yaml
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict

class CampaignListResponse(BaseModel):
    data: List[Any]
    pagination: Dict[str, Any]

class CreateCampaignRequest(BaseModel):
    name: str
    target_audience: Optional[str] = None
    budget_cents: int

class CampaignResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    status: str
    target_audience: Optional[str] = None
    budget_cents: int
    created_at: str
    updated_at: str

class CreateContentAssetRequest(BaseModel):
    campaign_id: str
    title: str
    content_type: str
    initial_body: str

class PatchContentAssetRequest(BaseModel):
    title: str

class ContentAssetResponse(BaseModel):
    id: str
    workspace_id: str
    campaign_id: str
    title: str
    status: str
    current_version_id: str
    created_at: str
    updated_at: str

class CreateContentVersionRequest(BaseModel):
    content_body: str
    change_summary: str

class ContentVersionResponse(BaseModel):
    id: str
    content_asset_id: str
    version_number: int
    content_version_hash: str
    claims_state_hash: str
    claims_evaluation_status: str
    content_body: str
    change_summary: Optional[str] = None
    created_by: str
    created_at: str

class ContentVersionListResponse(BaseModel):
    asset_id: str
    versions: List[Any]

class SubmitVerificationRequest(BaseModel):
    content_version_id: str
    notes: Optional[str] = None

class DualActorApprovalRequest(BaseModel):
    content_asset_id: str
    content_version_id: str
    actor2_grant_token: str

class ApprovalRecordResponse(BaseModel):
    id: str
    workspace_id: str
    content_asset_id: str
    content_version_id: str
    status: str
    approver1_id: str
    approver2_id: str
    expires_at: str
    created_at: str

class SchedulePublishOperationRequest(BaseModel):
    content_asset_id: str
    content_version_id: str
    approval_record_id: str
    destination_channel_id: str
    destination_account_id: str
    scheduled_at: str

class PublishOperationResponse(BaseModel):
    id: str
    workspace_id: str
    content_asset_id: str
    content_version_id: str
    approval_record_id: str
    destination_channel_id: str
    destination_account_id: str
    status: str
    payload_hash: Optional[str] = None
    kms_key_version: Optional[str] = None
    execution_claim_id: Optional[str] = None
    claimed_by_worker: Optional[str] = None
    lease_expires_at: Optional[str] = None
    scheduled_at: str
    created_at: str
    updated_at: str

class ClaimOperationRequest(BaseModel):
    requested_lease_seconds: int

class ClaimedTupleResponse(BaseModel):
    workspace_id: str
    approval_id: str
    content_version_id: str
    content_version_hash: str
    claims_state_hash: str
    destination_channel: str
    destination_account: str
    schedule_slot_utc: str
    approval_policy_version: str
    execution_claim_id: str
    lease_expires_at: str

class DispatchOperationRequest(BaseModel):
    execution_claim_id: str

class CompleteOperationRequest(BaseModel):
    execution_claim_id: str
    provider_publication_id: str
    published_at: str
    provider_metadata: Optional[Dict[str, Any]] = None

class FailOperationRequest(BaseModel):
    execution_claim_id: str
    failure_type: str
    error_code: str
    error_message: str

class ReclaimLeasesRequest(BaseModel):
    batch_size: int

class ReclaimLeasesResponse(BaseModel):
    reclaimed_count: int

class ReconcileRequest(BaseModel):
    expired_execution_claim_id: str

class ReconcileResponse(BaseModel):
    operation_id: str
    provider_status: str
    reconciled_to_state: str

