// Auto-generated TypeScript types from openapi_v1.0_final.yaml

export interface CampaignListResponse {
  data: unknown[];
  pagination: Record<string, unknown>;
}

export interface CreateCampaignRequest {
  name: string;
  target_audience?: string;
  budget_cents: number;
}

export interface CampaignResponse {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  target_audience?: string;
  budget_cents: number;
  created_at: string;
  updated_at: string;
}

export interface CreateContentAssetRequest {
  campaign_id: string;
  title: string;
  content_type: string;
  initial_body: string;
}

export interface ContentAssetResponse {
  id: string;
  workspace_id: string;
  campaign_id: string;
  title: string;
  status: string;
  current_version_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContentVersionRequest {
  content_body: string;
  change_summary: string;
}

export interface ContentVersionResponse {
  id: string;
  content_asset_id: string;
  version_number: number;
  content_version_hash: string;
  claims_state_hash: string;
  claims_evaluation_status: 'VERIFIED' | 'UNVERIFIED' | 'HIGH_RISK_REJECTED';
  content_body: string;
  change_summary?: string;
  created_by: string;
  created_at: string;
}
