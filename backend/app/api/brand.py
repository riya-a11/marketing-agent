from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.agents.brand_agent import brand_agent

router = APIRouter(prefix="/brand-profile", tags=["Brand Memory"])

@router.post("/generate")
async def generate_brand_profile(interview_data: Dict[str, Any]):
    """Synthesizes Living Brand Memory JSON from onboarding interview slots and saves to database."""
    try:
        slots = interview_data.get("extracted_slots", interview_data)
        profile = await brand_agent.generate_brand_profile(slots)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
async def get_brand_profile():
    """Returns the current active Living Brand Memory."""
    return {
        "brand_name": "NexusAI",
        "industry": "AI / B2B SaaS",
        "mission": "Automate high-converting marketing for early stage startup founders.",
        "vision": "Empower solo founders to scale marketing effortlessly without hiring agencies.",
        "brand_voice": "Authoritative, Energetic, Inspiring",
        "tone": "Confident & Professional",
        "target_audience": "Early stage startup founders & incubator cohort members",
        "buyer_personas": ["Tech Solo Founders", "Incubator Cohort Members", "Bootstrapped SaaS Builders"],
        "competitors": ["Traditional Marketing Agencies", "Manual Freelancers"],
        "writing_style": "Punchy, value-driven, clear call to actions, no fluff.",
        "taboo_topics": ["Aggressive sales pressure", "Overhyped corporate jargon", "Unrealistic growth promises"],
        "hashtags": ["#StartupMarketing", "#AIMarketing", "#FounderJourney", "#BuildInPublic"],
        "seo_keywords": ["AI marketing assistant", "startup brand identity", "social media content automation"],
        "cta_style": "Direct & Action-Oriented"
    }
