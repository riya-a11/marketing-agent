from fastapi import APIRouter, HTTPException
from app.models.schemas import VideoStoryboardRequest, VideoRenderRequest
from app.agents.video_agent import video_agent
from app.providers.video_service import get_video_provider

from app.providers.montage_engine import montage_engine

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
    """Triggers multi-provider video rendering (Google Veo / NVIDIA Cosmos / Mock) + OpenMontage assembly."""
    try:
        provider = get_video_provider(req.provider_name)
        raw_clips = await provider.render_video(req.storyboard.dict())
        
        # Assemble final video using OpenMontage engine
        montage_result = await montage_engine.assemble_reel(req.storyboard.dict())
        
        return {
            "rendering": raw_clips,
            "montage_assembly": montage_result,
            "status": "completed",
            "video_url": montage_result["output_video_url"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
