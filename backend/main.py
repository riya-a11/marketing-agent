import os
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NexusAI Backend", description="AI Marketing Operating System")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase credentials")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "NexusAI Backend"}

# --- Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class InterviewMessage(BaseModel):
    message: str
    session_id: str

class BrandProfileGenerateRequest(BaseModel):
    brand_name: str
    industry: str
    mission: str
    target_audience: str
    brand_voice: str
    competitors: str

class ContentGenerateRequest(BaseModel):
    platform: str
    content_type: str

class VideoStoryboardRequest(BaseModel):
    post_body: str
    duration: str
    visual_style: str
    voice_tone: str

class VideoRenderRequest(BaseModel):
    storyboard: Dict[str, Any]

# --- Endpoints ---

@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
        return {"session": response.session, "user": response.user}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@app.post("/api/v1/interview/message")
def interview_message(req: InterviewMessage):
    # Mock LLM slot extraction
    return {
        "reply": "Tell me more about your target audience.",
        "progress": 50,
        "extracted_slots": {"brand_name": "NexusAI", "industry": "AI SaaS"}
    }

@app.post("/api/v1/brand-profile/generate")
def generate_brand_profile(req: BrandProfileGenerateRequest):
    # Mock generation of living brand memory
    memory = {
        "brand_name": req.brand_name,
        "industry": req.industry,
        "mission": req.mission,
        "target_audience": req.target_audience,
        "brand_voice": req.brand_voice,
        "competitors": req.competitors.split(","),
        "tone": "Confident",
        "writing_style": "Punchy",
        "taboo_topics": ["Jargon"],
        "hashtags": ["#marketing"],
        "seo_keywords": ["ai marketing"],
        "cta_style": "Direct"
    }
    return {"status": "success", "brand_memory": memory}

@app.get("/api/v1/brand-profile/me")
def get_brand_profile():
    # Mock retrieve
    return {"status": "success", "brand_memory": {}}

@app.post("/api/v1/content/generate")
def generate_content(req: ContentGenerateRequest):
    # Mock content generation
    return {
        "variations": [
            {"body": f"Post 1 for {req.platform}", "style_label": "Educational", "score": 90},
            {"body": f"Post 2 for {req.platform}", "style_label": "Inspirational", "score": 88},
            {"body": f"Post 3 for {req.platform}", "style_label": "Direct", "score": 95}
        ]
    }

@app.get("/api/v1/campaigns")
def list_campaigns():
    return {"campaigns": []}

@app.post("/api/v1/video/storyboard")
def generate_storyboard(req: VideoStoryboardRequest):
    return {
        "script": "Welcome to NexusAI...",
        "scenes": [
            {"duration": 5, "description": "Intro shot", "text_overlay": "Meet NexusAI", "prompt": "Cinematic shot of a founder"}
        ]
    }

@app.post("/api/v1/video/render")
def render_video(req: VideoRenderRequest):
    return {"status": "processing", "video_url": "https://example.com/rendered_video.mp4"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
