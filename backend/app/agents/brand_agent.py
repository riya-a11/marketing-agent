import json
import logging
from pathlib import Path
from typing import Dict, Any
from app.providers.base import BaseProvider
from app.providers.provider_factory import get_provider
from app.database import supabase

logger = logging.getLogger("brand_agent")
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

class BrandAgent:
    """Agent converting founder interview responses into a Living Brand Memory JSON and storing it in Supabase."""

    def __init__(self, provider: BaseProvider = None):
        self._provider = provider

    @property
    def provider(self) -> BaseProvider:
        if not self._provider:
            self._provider = get_provider()
        return self._provider

    async def generate_brand_profile(self, interview_slots: Dict[str, Any], user_id: str = "default-user") -> Dict[str, Any]:
        system_prompt = (PROMPTS_DIR / "brand.md").read_text(encoding="utf-8")
        user_payload = f"INTERVIEW EXTRACTED SLOTS:\n{json.dumps(interview_slots, indent=2)}"

        try:
            raw = await self.provider.chat(system_prompt, user_payload)
            brand_memory = json.loads(raw)
        except Exception as e:
            logger.warning(f"Fallback to brand memory synthesis: {e}")
            brand_memory = {
                "brand_name": interview_slots.get("brand_name", "NexusAI"),
                "industry": interview_slots.get("industry", "AI / B2B SaaS"),
                "mission": interview_slots.get("mission", "Automate high-converting marketing for early stage startup founders."),
                "vision": "Empower solo founders to scale marketing effortlessly without hiring agencies.",
                "brand_voice": interview_slots.get("brand_voice", "Authoritative, Energetic, Inspiring"),
                "tone": "Confident & Professional",
                "target_audience": interview_slots.get("target_audience", "Early stage startup founders & incubator cohort members"),
                "buyer_personas": ["Tech Solo Founders", "Incubator Cohort Members", "Bootstrapped SaaS Builders"],
                "competitors": [interview_slots.get("competitors", "Traditional Marketing Agencies")],
                "writing_style": "Punchy, value-driven, clear call to actions, no fluff.",
                "taboo_topics": ["Aggressive sales pressure", "Overhyped corporate jargon", "Unrealistic growth promises"],
                "hashtags": ["#StartupMarketing", "#AIMarketing", "#FounderJourney", "#BuildInPublic"],
                "seo_keywords": ["AI marketing assistant", "startup brand identity", "social media content automation"],
                "cta_style": "Direct & Action-Oriented"
            }

        # Save to Supabase database if connected
        if supabase:
            try:
                data = {
                    "brand_name": brand_memory.get("brand_name", "NexusAI"),
                    "industry": brand_memory.get("industry", "Tech"),
                    "brand_voice": brand_memory.get("brand_voice", "Professional"),
                    "tone": brand_memory.get("tone", "Confident"),
                    "brand_memory": brand_memory
                }
                supabase.table("brand_profiles").insert(data).execute()
                logger.info("Saved Living Brand Memory to Supabase.")
            except Exception as err:
                logger.warning(f"Could not persist brand profile to Supabase: {err}")

        return brand_memory

brand_agent = BrandAgent()
