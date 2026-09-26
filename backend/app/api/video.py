from fastapi import APIRouter, HTTPException
from app.models.schemas import VideoStoryboardRequest, VideoRenderRequest
from app.agents.video_agent import video_agent
from app.providers.video_service import render_video_job
from app.providers.montage_engine import assemble_reel

router = APIRouter(prefix="/video", tags=["Video Generation Module"])

@router.post("/storyboard")
async def create_storyboard(req: VideoStoryboardRequest):
    """Generates 9:16 vertical reel storyboard, script, and AI video prompts from selected social post."""
    try:
        return await video_agent.generate_storyboard(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/render")
async def render_video(req: VideoRenderRequest):
    """Triggers multi-provider video rendering (Google Veo / Google Flow / OpenMontage)."""
    try:
        raw_clips = await render_video_job(req.provider_name, req.storyboard.dict())
        
        return {
            "status": "completed",
            "provider": raw_clips["provider"],
            "aspect_ratio": "9:16",
            "video_url": raw_clips["video_url"],
            "rendering": raw_clips,
            "montage_assembly": raw_clips.get("montage", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
