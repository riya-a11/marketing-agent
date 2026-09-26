// Thin client for the Marketing OS backend.
// NEXT_PUBLIC_ prefix is required so the value is inlined into the browser bundle
// at build time (see node_modules/next/dist/docs/.../environment-variables.md).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const activeWorkspaceId = typeof window !== "undefined"
    ? localStorage.getItem("workspace_id") || "00000000-0000-0000-0000-000000000001"
    : "00000000-0000-0000-0000-000000000001";

  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Workspace-ID": activeWorkspaceId,
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

// ---- Authentication --------------------------------------------------------

export interface AuthResponse {
  token?: string;
  message?: string;
  user?: { email: string; id: string };
}

export function loginUser(params: { email: string; password: string }) {
  return fetchApi<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function signupUser(params: { email: string; password: string; role?: string }) {
  return fetchApi<AuthResponse>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function logoutUser() {
  return fetchApi<{ message: string }>("/api/v1/auth/logout", {
    method: "POST",
  });
}

export function getMe() {
  return fetchApi<{ id: string; email: string; role: string; workspaces: string[] }>("/api/v1/auth/me");
}

export function forgotPassword(email: string) {
  return fetchApi<{ message: string; reset_token?: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(params: { reset_token: string; new_password: string }) {
  return fetchApi<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ---- Social Authentication & Account Connections --------------------------

export interface ConnectedAccount {
  platform: string;
  account_id?: string;
  account_handle: string;
  display_name?: string;
  avatar_url?: string;
  status: "connected" | "disconnected" | "error";
  scopes?: string[];
  updated_at?: string;
}

export function getSocialAccounts() {
  return fetchApi<{ accounts: ConnectedAccount[] }>("/api/v1/campaigns/social-accounts");
}

export function getSocialAuthorizeUrl(platform: string) {
  return fetchApi<{ platform: string; authorization_url: string; state: string }>(
    `/api/v1/social-auth/${platform}/authorize`
  );
}

export function connectSocialCallback(platform: string, code: string, state?: string) {
  const query = new URLSearchParams({ code, ...(state ? { state } : {}) });
  return fetchApi<{ status: string; message: string; account: ConnectedAccount }>(
    `/api/v1/social-auth/${platform}/callback?${query.toString()}`
  );
}

export function disconnectSocialAccount(platform: string) {
  return fetchApi<{ status: string; platform: string }>(`/api/v1/social-auth/${platform}/disconnect`, {
    method: "POST",
  });
}

export function directConnectSocialAccount(platform: string, params: {
  account_handle: string;
  display_name?: string;
  access_token?: string;
  avatar_url?: string;
}) {
  return fetchApi<{ status: string; message: string; account: ConnectedAccount }>(
    `/api/v1/social-auth/${platform}/connect`,
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
}

// ---- Founder Onboarding & Adaptive Interview -------------------------------

export interface InterviewTurnResponse {
  reply: string;
  extracted_slots: Record<string, string>;
  missing_slots: string[];
  completion_percentage: number;
}

export function sendInterviewMessage(params: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  current_slots?: Record<string, unknown>;
}) {
  return fetchApi<InterviewTurnResponse>("/api/v1/interview/message", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function generateBrandProfile(interviewData: Record<string, unknown>) {
  return fetchApi<Record<string, unknown>>("/api/v1/brand-profile/generate", {
    method: "POST",
    body: JSON.stringify(interviewData),
  });
}

export function getBrandProfile() {
  return fetchApi<Record<string, unknown>>("/api/v1/brand-profile/me");
}

export function updateBrandProfile(data: Record<string, unknown>) {
  return fetchApi<Record<string, unknown>>("/api/v1/brand-profile/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ---- Studio hero workflow -------------------------------------------------

export interface Angle {
  id: string;
  tag: string;
  is_recommended: boolean;
  headline: string;
  rationale: string;
  evidence_used: string;
}

export interface AnalyzeResult {
  update_assessment?: string;
  is_worth_marketing?: boolean;
  angles: Angle[];
}

export function analyzeUpdate(params: { raw_update: string; brand_memory?: unknown }) {
  return fetchApi<AnalyzeResult>("/api/v1/content/analyze-update", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Channels vary by platform: LinkedIn/X carry post_text, Instagram a caption,
// video a scene list. The index signature keeps room for fields the backend
// adds without forcing a frontend change.
export interface ChannelContent {
  post_text?: string;
  caption?: string;
  cta?: string;
  hook?: string;
  hashtags?: string[];
  scenes?: Array<{ voiceover?: string; visual?: string }>;
  [key: string]: unknown;
}

export interface CampaignPackage {
  campaign_id: string;
  version: number;
  campaign_title?: string;
  core_thesis?: string;
  channels: Record<string, ChannelContent>;
  advisor_critique?: Array<{ status: string; title: string; message: string; suggested_fix?: string }>;
}

export function generateCampaignPackage(params: {
  raw_update: string;
  selected_angle: unknown;
  brand_memory?: unknown;
}) {
  return fetchApi<CampaignPackage>("/api/v1/content/generate-campaign-package", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ---- Claims Verification Gate --------------------------------------------

export type ClaimStatus = "VERIFIED" | "NEEDS_EVIDENCE" | "PROHIBITED";
export type ClaimDecision =
  | "ALLOWED_BY_EVIDENCE"
  | "ALLOWED_BY_FOUNDER_OVERRIDE"
  | "NEEDS_OVERRIDE"
  | "BLOCKED";

export interface GatedClaim {
  id: string;
  text: string;
  channel: string;
  source?: string | null;
  evidence?: string | null;
  confidence: number;
  status: ClaimStatus;
  gate_action: "allow" | "flag" | "block";
  decision: ClaimDecision;
}

export interface OttoIntervention {
  claim_id: string;
  claim_text: string;
  severity: "high" | "medium" | "low";
  observation: string;
  reason: string;
  action: string;
}

export interface ClaimsGateResult {
  gate_status: "passed" | "blocked";
  summary: { verified: number; needs_evidence: number; prohibited: number };
  claims: GatedClaim[];
  otto_interventions: OttoIntervention[];
}

export function verifyClaims(params: {
  channels: Record<string, unknown>;
  brand_memory?: unknown;
  known_claims?: unknown[];
  founder_overrides?: Record<string, boolean>;
  campaign_id?: string | null;
}) {
  return fetchApi<ClaimsGateResult>("/api/v1/content/verify-claims", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ---- Multi-platform publishing -------------------------------------------
// NOTE: the client sends campaign_id + version_no. The backend OWNS the
// idempotency-key derivation (idemp:{campaign_id}:{platform}:v{version_no}) —
// we deliberately never construct or send an idempotency_key here.

export interface PublishReceipt {
  platform: string;
  status: "published" | "failed";
  post_id?: string;
  permalink?: string;
  channel_name?: string;
  provider_mode?: string;
  published_at?: string;
  is_idempotent_replay?: boolean;
  error?: string;
  error_code?: string;
  retryable?: boolean;
}

export interface PublishResult {
  batch_id: string;
  campaign_id: string;
  status: "published" | "partial" | "failed";
  total: number;
  succeeded: number;
  failed: number;
  results: PublishReceipt[];
}

export function multiPublish(params: {
  platforms: string[];
  platform_content?: Record<string, unknown>;
  content_text?: string;
  cta?: string;
  campaign_id?: string | null;
  version_no?: number;
  title?: string;
  mode?: string;
}) {
  return fetchApi<PublishResult>("/api/v1/campaigns/multi-publish", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ---- Campaign Storage & Management -----------------------------------------

export interface StoredCampaign {
  id: string;
  title: string;
  content_type?: string;
  type?: string;
  platform: string;
  content_text: string;
  text?: string;
  cta?: string;
  style_label?: string;
  quality_score?: number;
  status: string;
  date?: string;
  created_at?: string;
  channels?: Record<string, unknown>;
  review_breakdown?: Record<string, unknown>;
}

export function getCampaigns() {
  return fetchApi<StoredCampaign[]>("/api/v1/campaigns/");
}

export function saveCampaign(payload: Partial<StoredCampaign> & { content_text: string }) {
  return fetchApi<{ status: string; campaign: StoredCampaign }>("/api/v1/campaigns/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteCampaign(campaignId: string) {
  return fetchApi<{ status: string; id: string }>(`/api/v1/campaigns/${campaignId}`, {
    method: "DELETE",
  });
}

// ---- Email Marketing & Marketing Calendar Subsystems -----------------------

export interface EmailCampaignContent {
  sender_name: string;
  sender_email?: string | null;
  reply_to?: string | null;
  subject: string;
  preview_text: string;
  source_format: string;
  source_body: string;
  rendered_html: string;
  plain_text_fallback: string;
  cta_button_text?: string | null;
  cta_url?: string | null;
  target_audience_segment?: string;
}

export type CalendarEventStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "PUBLISH_FAILED"
  | "PUBLISH_UNKNOWN"
  | "REJECTED"
  | "CANCELLED";

export interface CalendarEvent {
  id: string;
  org_id: string;
  brand_id: string;
  campaign_id?: string | null;
  title: string;
  channel: "linkedin" | "x" | "instagram" | "email" | "video" | string;
  scheduled_at: string;
  timezone: string;
  status: CalendarEventStatus;
  content_version: number;
  current_content_hash: string;
  approved_version?: number | null;
  approved_content_hash?: string | null;
  retry_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  channel_payload: {
    post_text?: string;
    caption?: string;
    cta?: string;
    media_asset_ids?: string[];
    visual_headline?: string;
    sender_name?: string;
    sender_email?: string;
    subject?: string;
    preview_text?: string;
    source_body?: string;
    rendered_html?: string;
    plain_text_fallback?: string;
    cta_button_text?: string;
    cta_url?: string;
    hook_line?: string;
    scenes?: Array<{ scene_no: number; visual: string; voiceover: string }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

export interface VerificationAuditLog {
  id: string;
  event_id: string;
  org_id: string;
  user_id: string;
  user_role: string;
  action: "APPROVED" | "REJECTED" | "CANCELLED" | "MUTATED_RESET";
  content_version: number;
  content_hash: string;
  snapshot_payload: string;
  scheduled_at_snapshot: string;
  notes?: string | null;
  created_at: string;
}

export interface IngestionRow {
  row_number: number;
  title: string;
  channel: string;
  scheduled_at: string;
  timezone: string;
  content_text: string;
  subject?: string | null;
  cta?: string | null;
  status: "valid" | "warning" | "error";
  errors: string[];
  warnings: string[];
}

export interface IngestParseResponse {
  filename: string;
  total_rows: number;
  valid_rows_count: number;
  error_rows_count: number;
  detected_columns: Record<string, string>;
  rows: IngestionRow[];
}

export interface ProposedEventItem {
  temp_id: string;
  channel: string;
  scheduled_at: string;
  display_time: string;
  title: string;
  draft_hook: string;
  cta?: string | null;
  has_factual_claims: boolean;
  claims_status: string;
}

export interface AIScheduleProposalResponse {
  proposal_id: string;
  summary: string;
  timezone: string;
  assumptions: string[];
  ambiguities: string[];
  proposed_events: ProposedEventItem[];
}

export function getCalendarEvents(params?: {
  org_id?: string;
  brand_id?: string;
  status?: string;
  channel?: string;
  start_date?: string;
  end_date?: string;
}) {
  const query = new URLSearchParams();
  if (params?.org_id) query.append("org_id", params.org_id);
  if (params?.brand_id) query.append("brand_id", params.brand_id);
  if (params?.status) query.append("status", params.status);
  if (params?.channel) query.append("channel", params.channel);
  if (params?.start_date) query.append("start_date", params.start_date);
  if (params?.end_date) query.append("end_date", params.end_date);

  const qs = query.toString();
  return fetchApi<CalendarEvent[]>(`/api/v1/calendar/events${qs ? `?${qs}` : ""}`);
}

export function createCalendarEvent(event: Partial<CalendarEvent> & { title: string; channel: string; scheduled_at: string; channel_payload: Record<string, unknown> }) {
  return fetchApi<CalendarEvent>("/api/v1/calendar/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>) {
  return fetchApi<CalendarEvent>(`/api/v1/calendar/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteCalendarEvent(eventId: string) {
  return fetchApi<{ status: string; id: string }>(`/api/v1/calendar/events/${eventId}`, {
    method: "DELETE",
  });
}

export function duplicateCalendarEvent(eventId: string) {
  return fetchApi<{ status: string; event: CalendarEvent }>(`/api/v1/calendar/events/${eventId}/duplicate`, {
    method: "POST",
  });
}

export function approveCalendarEvent(eventId: string, params: {
  content_version: number;
  content_hash: string;
  user_id?: string;
  user_role?: string;
  immediate_action?: string;
  rescheduled_at?: string;
  notes?: string;
}) {
  return fetchApi<{ status: string; event: CalendarEvent }>(`/api/v1/calendar/events/${eventId}/approve`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function rejectCalendarEvent(eventId: string, params: { reason: string; user_id?: string; user_role?: string }) {
  return fetchApi<{ status: string; event: CalendarEvent }>(`/api/v1/calendar/events/${eventId}/reject`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function bulkApproveCalendarEvents(params: {
  items: Array<{ event_id: string; content_version: number; content_hash: string }>;
  user_id?: string;
  user_role?: string;
}) {
  return fetchApi<{
    total_requested: number;
    success_count: number;
    failed_count: number;
    results: Array<{ event_id: string; status: string; error?: string; event?: CalendarEvent }>;
  }>("/api/v1/calendar/events/bulk-approve", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function ingestParseScheduleFile(file: File, timezone: string = "Asia/Kolkata"): Promise<IngestParseResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("timezone", timezone);

  const res = await fetch(`${API_BASE}/api/v1/calendar/ingest/parse`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const b = await res.json();
      detail = b?.detail || detail;
    } catch {
      /* non-json */
    }
    throw new Error(`Upload error ${res.status}: ${detail}`);
  }
  return res.json();
}

export function ingestConfirmSchedule(params: { org_id?: string; brand_id?: string; rows: IngestionRow[] }) {
  return fetchApi<{ status: string; total_committed: number; events: CalendarEvent[] }>("/api/v1/calendar/ingest/confirm", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function proposeAISchedule(params: { prompt: string; brand_id?: string; brand_memory?: unknown; timezone?: string }) {
  return fetchApi<AIScheduleProposalResponse>("/api/v1/calendar/propose-schedule", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function getCalendarEventAuditLogs(eventId: string) {
  return fetchApi<{ event_id: string; logs: VerificationAuditLog[] }>(`/api/v1/calendar/events/${eventId}/audit-logs`);
}

export function runSchedulerCycle() {
  return fetchApi<{ status: string; processed_count: number; dispatches: unknown[] }>("/api/v1/calendar/worker/run-cycle", {
    method: "POST",
  });
}
