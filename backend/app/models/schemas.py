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
