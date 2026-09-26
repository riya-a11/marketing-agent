from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class InterviewRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default-session"
    context: Optional[Dict[str, Any]] = None

class InterviewResponse(BaseModel):
    reply: str
    missing_slots: List[str] = []
    completion_percentage: int = 0

class BrandProfile(BaseModel):
    brand_name: str
    industry: Optional[str] = None
    brand_voice: Optional[str] = None
    tone: Optional[str] = None
    brand_memory: Dict[str, Any] = {}

class ContentGenerateRequest(BaseModel):
    brand_profile_id: Optional[str] = "default-profile"
    content_type: str
    platform: str = "linkedin"
    topic_or_hook: Optional[str] = None
    brand_memory: Optional[Dict[str, Any]] = None

class ContentVariation(BaseModel):
    variation_no: int
    platform: str
    content_text: str
    cta: str
    style_label: str

class ReviewScorecard(BaseModel):
    overall_score: int
    breakdown: Dict[str, int]
    feedback_notes: str

class VideoPreferences(BaseModel):
    aspect_ratio: str = "9:16"
    target_duration: str = "30s" # options: 15s, 30s, 60s
    visual_style: str = "Cinematic Founder" # options: Cinematic Founder, Minimalist Tech, Dynamic UGC, Kinetic Typography
    voice_tone: str = "Energetic" # options: Energetic, Authoritative, Relatable, Enthusiastic

class Scene(BaseModel):
    scene_number: int
    duration_seconds: int
    visual_description: str
    text_overlay: str
    voiceover_text: str
    ai_video_prompt: str

class VideoStoryboardRequest(BaseModel):
    selected_post: str
    brand_memory: Optional[Dict[str, Any]] = None
    preferences: Optional[VideoPreferences] = None

class VideoStoryboardResponse(BaseModel):
    video_title: str
    aspect_ratio: str = "9:16"
    total_estimated_seconds: int
    full_voiceover_script: str
    scenes: List[Scene]

class VideoRenderRequest(BaseModel):
    campaign_id: Optional[str] = "default-campaign"
    provider_name: str = "veo" # options: veo, cosmos, mock
    storyboard: VideoStoryboardResponse

class N8nPublishRequest(BaseModel):
    campaign_id: Optional[str] = None
    title: Optional[str] = "Social Campaign"
    platform: str = "linkedin" # linkedin, x, instagram, facebook
    content_text: str
    cta: Optional[str] = ""
    style_label: Optional[str] = "Direct"
    quality_score: Optional[int] = 90
    media_url: Optional[str] = None
    scheduled_at: Optional[str] = None
    custom_webhook_url: Optional[str] = None

class N8nPublishResponse(BaseModel):
    status: str
    platform: str
    message: str
    webhook_url: str
    execution_id: Optional[str] = None
    dispatched_at: str

# ---------------------------------------------------------------------------
# Typed Channel Content Models
# ---------------------------------------------------------------------------

class LinkedInContent(BaseModel):
    post_text: str
    cta: Optional[str] = None
    media_asset_ids: List[str] = []

class XContent(BaseModel):
    post_text: str
    thread_items: List[str] = []
    cta: Optional[str] = None
    media_asset_ids: List[str] = []

class InstagramContent(BaseModel):
    visual_headline: str
    caption: str
    cta: Optional[str] = None
    media_asset_ids: List[str] = []

class VideoContent(BaseModel):
    title: str
    hook_line: str
    aspect_ratio: str = "9:16"
    scenes: List[Dict[str, Any]] = []

class EmailCampaignContent(BaseModel):
    sender_name: str
    sender_email: Optional[str] = None
    reply_to: Optional[str] = None
    subject: str
    preview_text: str
    source_format: str = "markdown"
    source_body: str
    rendered_html: str
    plain_text_fallback: str
    cta_button_text: Optional[str] = None
    cta_url: Optional[str] = None
    target_audience_segment: Optional[str] = "All Subscribers"

# ---------------------------------------------------------------------------
# Marketing Calendar Models & Schemas
# ---------------------------------------------------------------------------

class CalendarEventBase(BaseModel):
    title: str
    channel: str # linkedin, x, instagram, email, video
    scheduled_at: str # ISO 8601 UTC
    timezone: str = "Asia/Kolkata"
    campaign_id: Optional[str] = None
    channel_payload: Dict[str, Any]

class CalendarEventCreate(CalendarEventBase):
    org_id: Optional[str] = "default_org"
    brand_id: Optional[str] = "default_brand"
    status: Optional[str] = "PENDING_VERIFICATION" # DRAFT or PENDING_VERIFICATION

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    channel: Optional[str] = None
    scheduled_at: Optional[str] = None
    timezone: Optional[str] = None
    channel_payload: Optional[Dict[str, Any]] = None
    status: Optional[str] = None # e.g. DRAFT or PENDING_VERIFICATION

class CalendarApprovalRequest(BaseModel):
    content_version: int
    content_hash: str
    user_id: Optional[str] = "founder@brand.com"
    user_role: Optional[str] = "reviewer" # viewer, editor, reviewer, admin
    immediate_action: Optional[str] = None # DISPATCH_NOW or RESCHEDULE if scheduled_at is past
    rescheduled_at: Optional[str] = None
    notes: Optional[str] = None

class CalendarRejectRequest(BaseModel):
    user_id: Optional[str] = "founder@brand.com"
    user_role: Optional[str] = "reviewer"
    reason: str

class BulkApprovalItem(BaseModel):
    event_id: str
    content_version: int
    content_hash: str

class BulkApprovalRequest(BaseModel):
    items: List[BulkApprovalItem]
    user_id: Optional[str] = "founder@brand.com"
    user_role: Optional[str] = "reviewer"

class CalendarEventOut(BaseModel):
    id: str
    org_id: str
    brand_id: str
    campaign_id: Optional[str] = None
    title: str
    channel: str
    scheduled_at: str
    timezone: str
    status: str
    content_version: int
    current_content_hash: str
    approved_version: Optional[int] = None
    approved_content_hash: Optional[str] = None
    retry_count: int = 0
    created_by: str
    created_at: str
    updated_at: str
    channel_payload: Dict[str, Any]
    last_audit: Optional[Dict[str, Any]] = None

class IngestionRow(BaseModel):
    row_number: int
    title: str
    channel: str
    scheduled_at: str
    timezone: str = "Asia/Kolkata"
    content_text: str
    subject: Optional[str] = None
    cta: Optional[str] = None
    status: str = "valid" # valid, warning, error
    errors: List[str] = []
    warnings: List[str] = []

class IngestParseResponse(BaseModel):
    filename: str
    total_rows: int
    valid_rows_count: int
    error_rows_count: int
    detected_columns: Dict[str, str]
    rows: List[IngestionRow]

class IngestConfirmRequest(BaseModel):
    org_id: Optional[str] = "default_org"
    brand_id: Optional[str] = "default_brand"
    rows: List[IngestionRow]

class AIScheduleProposalRequest(BaseModel):
    prompt: str
    brand_id: Optional[str] = "default_brand"
    brand_memory: Optional[Dict[str, Any]] = None
    timezone: Optional[str] = "Asia/Kolkata"

class ProposedEventItem(BaseModel):
    temp_id: str
    channel: str
    scheduled_at: str
    display_time: str
    title: str
    draft_hook: str
    cta: Optional[str] = None
    has_factual_claims: bool = False
    claims_status: str = "UNVERIFIED_CLAIMS"

class AIScheduleProposalResponse(BaseModel):
    proposal_id: str
    summary: str
    timezone: str
    assumptions: List[str]
    ambiguities: List[str]
    proposed_events: List[ProposedEventItem]

