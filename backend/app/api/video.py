from fastapi import APIRouter, HTTPException
from app.models.schemas import VideoStoryboardRequest, VideoRenderRequest
from app.agents.video_agent import video_agent
from app.providers.video_service import get_video_provider

router = APIRouter(prefix="/video", tags=["Video Generation Module"])

@router.post("/storyboard")
async def create_storyboard(req: VideoStoryboardRequest):
    """Generates 9:16 vertical reel storyboard, script, and AI video prompts from selected social post."""
    try:
        storyboard = await video_agent.generate_storyboard(req)
        return storyboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/render")
async def render_video(req: VideoRenderRequest):
    """Triggers multi-provider video rendering (Google Veo / NVIDIA Cosmos / Mock)."""
    try:
        provider = get_video_provider(req.provider_name)
        res = await provider.render_video(req.storyboard.dict())
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
