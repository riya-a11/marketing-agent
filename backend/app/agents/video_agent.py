import json
import logging
from pathlib import Path
from typing import Dict, Any
from app.providers.base import BaseProvider
from app.providers.provider_factory import get_provider
from app.models.schemas import VideoStoryboardRequest, VideoPreferences

logger = logging.getLogger("video_agent")
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

class VideoAgent:
    """Agent transforming selected posts into 9:16 short-form video storyboards, voiceover scripts, and AI video prompts."""

    def __init__(self, provider: BaseProvider = None):
        self._provider = provider

    @property
    def provider(self) -> BaseProvider:
        if not self._provider:
            self._provider = get_provider()
        return self._provider

    async def generate_storyboard(self, request: VideoStoryboardRequest) -> Dict[str, Any]:
        system_prompt = (PROMPTS_DIR / "video_storyboard.md").read_text(encoding="utf-8")
        prefs = request.preferences or VideoPreferences()
        brand_mem = request.brand_memory or {}

        formatted_user_prompt = f"""
SELECTED POST CONTENT:
{request.selected_post}

BRAND MEMORY:
{json.dumps(brand_mem, indent=2)}

FOUNDER PREFERENCES:
- Target Duration: {prefs.target_duration}
- Visual Style: {prefs.visual_style}
- Voice Tone: {prefs.voice_tone}
- Aspect Ratio: 9:16 (Vertical Reel)
"""

        from app.utils.json_helper import extract_and_parse_json
        try:
            raw_res = await self.provider.chat(system_prompt, formatted_user_prompt)
            return extract_and_parse_json(raw_res)
        except Exception as e:
            logger.warning(f"Fallback to structured mock storyboard due to parsing format: {e}")
            return {
                "video_title": f"9:16 Reel: {request.selected_post[:30]}...",
                "aspect_ratio": "9:16",
                "total_estimated_seconds": 30,
                "full_voiceover_script": "Are you struggling with early stage marketing? Here is how startup founders automate consistent content in under 5 minutes.",
                "scenes": [
                    {
                        "scene_number": 1,
                        "duration_seconds": 4,
                        "visual_description": "Vertical 9:16 close-up of a founder looking directly at camera with kinetic text overlay.",
                        "text_overlay": "Stop Wasting Time On Marketing 🚫",
                        "voiceover_text": "Are you struggling with early stage marketing?",
                        "ai_video_prompt": "9:16 vertical video, 4k resolution, cinematic portrait lighting, confident startup founder talking directly to camera, modern office background"
                    },
                    {
                        "scene_number": 2,
                        "duration_seconds": 6,
                        "visual_description": "Dynamic screen capture of AI workflow generating 3 social posts in 10 seconds.",
                        "text_overlay": "AI Operating System for Startups ⚡",
                        "voiceover_text": "Here is how startup founders automate consistent content in under 5 minutes.",
                        "ai_video_prompt": "9:16 vertical video, glowing futuristic UI dashboard displaying rapid AI text generation, sleek dark theme with indigo neon accents"
                    },
                    {
                        "scene_number": 3,
                        "duration_seconds": 5,
                        "visual_description": "Founder smiling, holding smartphone showing published post analytics growing.",
                        "text_overlay": "Try NexusAI Today! 🚀",
                        "voiceover_text": "Focus on building your product, let AI handle your brand growth.",
                        "ai_video_prompt": "9:16 vertical shot, enthusiastic founder pointing up at a call to action button, bright vibrant lighting"
                    }
                ]
            }

video_agent = VideoAgent()
