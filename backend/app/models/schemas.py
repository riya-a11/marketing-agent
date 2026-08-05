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
    brand_profile_id: str
    content_type: str
    platform: str = "linkedin"

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

