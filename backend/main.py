import os
import tempfile
import time
from typing import Any, Dict, List, Optional

import requests
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NexusAI Backend", description="AI Marketing Operating System")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase credentials")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

X_MEDIA_UPLOAD_URL = "https://api.x.com/2/media/upload"
X_TWEETS_URL = "https://api.x.com/2/tweets"
X_MEDIA_METADATA_URL = "https://api.x.com/2/media/metadata/create"
MEDIA_CHUNK_SIZE = 5 * 1024 * 1024

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

class PublishXRequest(BaseModel):
    video_url: Optional[str] = None
    caption: str
    alt_text: Optional[str] = None


def _x_headers(token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _check_x_response(response: requests.Response) -> None:
    if not response.ok:
        raise HTTPException(status_code=502, detail=response.text)


def _response_json(response: requests.Response) -> Dict[str, Any]:
    try:
        return response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail=response.text or "Invalid response from X API")


def _media_id(data: Dict[str, Any]) -> Optional[str]:
    media = data.get("data", {})
    return media.get("id") or media.get("media_id_string") or media.get("media_id")


def _wait_for_media_processing(token: str, media_id: str, processing_info: Dict[str, Any]) -> None:
    deadline = time.monotonic() + 600
    state = processing_info.get("state")

    while state in ("pending", "in_progress"):
        if time.monotonic() >= deadline:
            raise HTTPException(status_code=504, detail="Timed out waiting for X to process the video")

        delay = max(1, processing_info.get("check_after_secs", 1))
        time.sleep(min(delay, max(1, deadline - time.monotonic())))
        response = requests.get(
            X_MEDIA_UPLOAD_URL,
            headers=_x_headers(token),
            params={"command": "STATUS", "media_id": media_id},
            timeout=30,
        )
        _check_x_response(response)
        status_data = _response_json(response).get("data", {})
        processing_info = status_data.get("processing_info", {})
        state = processing_info.get("state")

    if state == "failed":
        error = processing_info.get("error", {})
        message = error.get("message") or "X could not process the uploaded video"
        raise HTTPException(status_code=502, detail=message)

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

@app.post("/api/v1/publish/x")
def publish_to_x(req: PublishXRequest):
    try:
        token = os.environ["X_ACCESS_TOKEN"]
    except KeyError:
        raise HTTPException(status_code=500, detail="X_ACCESS_TOKEN is not configured")

    if not token.strip():
        raise HTTPException(status_code=500, detail="X_ACCESS_TOKEN is not configured")

    headers = _x_headers(token)
    media_id: Optional[str] = None
    temp_path: Optional[str] = None

    try:
        if req.video_url:
            if req.alt_text and not req.alt_text.strip():
                raise HTTPException(status_code=422, detail="alt_text cannot be blank")

            try:
                with requests.get(req.video_url, stream=True, timeout=(15, 120)) as video_response:
                    if not video_response.ok:
                        raise HTTPException(status_code=502, detail=video_response.text)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as video_file:
                        temp_path = video_file.name
                        for chunk in video_response.iter_content(chunk_size=MEDIA_CHUNK_SIZE):
                            if chunk:
                                video_file.write(chunk)
            except requests.RequestException as exc:
                raise HTTPException(status_code=502, detail=str(exc))

            total_bytes = os.path.getsize(temp_path)
            if total_bytes == 0:
                raise HTTPException(status_code=422, detail="The downloaded video is empty")

            init_response = requests.post(
                X_MEDIA_UPLOAD_URL,
                headers=headers,
                data={
                    "command": "INIT",
                    "total_bytes": total_bytes,
                    "media_type": "video/mp4",
                    "media_category": "tweet_video",
                },
                timeout=30,
            )
            _check_x_response(init_response)
            media_id = _media_id(_response_json(init_response))
            if not media_id:
                raise HTTPException(status_code=502, detail=init_response.text or "X did not return a media ID")

            with open(temp_path, "rb") as video_file:
                segment_index = 0
                while True:
                    chunk = video_file.read(MEDIA_CHUNK_SIZE)
                    if not chunk:
                        break
                    append_response = requests.post(
                        X_MEDIA_UPLOAD_URL,
                        headers=headers,
                        data={
                            "command": "APPEND",
                            "media_id": media_id,
                            "segment_index": segment_index,
                        },
                        files={"media": ("video.mp4", chunk, "application/octet-stream")},
                        timeout=120,
                    )
                    _check_x_response(append_response)
                    segment_index += 1

            finalize_response = requests.post(
                X_MEDIA_UPLOAD_URL,
                headers=headers,
                data={"command": "FINALIZE", "media_id": media_id},
                timeout=30,
            )
            _check_x_response(finalize_response)
            finalize_data = _response_json(finalize_response)
            processing_info = finalize_data.get("data", {}).get("processing_info")
            if processing_info:
                _wait_for_media_processing(token, media_id, processing_info)

            if req.alt_text:
                metadata_response = requests.post(
                    X_MEDIA_METADATA_URL,
                    headers={**headers, "Content-Type": "application/json"},
                    json={"media_id": media_id, "alt_text": {"text": req.alt_text}},
                    timeout=30,
                )
                _check_x_response(metadata_response)

        tweet_payload: Dict[str, Any] = {"text": req.caption}
        if media_id:
            tweet_payload["media"] = {"media_ids": [media_id]}

        tweet_response = requests.post(
            X_TWEETS_URL,
            headers={**headers, "Content-Type": "application/json"},
            json=tweet_payload,
            timeout=30,
        )
        _check_x_response(tweet_response)
        tweet_data = _response_json(tweet_response)
        tweet_id = tweet_data.get("data", {}).get("id")
        if not tweet_id:
            raise HTTPException(status_code=502, detail=tweet_response.text or "X did not return a tweet ID")

        return {
            "status": "published",
            "tweet_id": tweet_id,
            "url": f"https://x.com/i/web/status/{tweet_id}",
        }
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
