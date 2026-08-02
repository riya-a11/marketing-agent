import os
import json
from fastapi import APIRouter
from typing import Dict, Any
from app.orchestrator.engine import orchestrator

router = APIRouter(prefix="/brand-profile", tags=["Brand Memory"])

def load_prompt(filename: str) -> str:
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "Default brand system prompt."

@router.post("/generate")
async def generate_brand_profile(interview_data: Dict[str, Any]):
    system_prompt = load_prompt("brand.md")
    raw_res = await orchestrator.execute_step(
        step_name="Brand Intelligence Synthesis",
        system_prompt=system_prompt,
        user_input=json.dumps(interview_data)
    )
    return json.loads(raw_res)

@router.get("/me")
def get_brand_profile():
    return {
        "brand_name": "NexusAI",
        "industry": "AI / B2B SaaS",
        "brand_voice": "Friendly, Professional, Authoritative",
        "buyer_personas": ["Busy Solo Founders", "Incubator Cohort Members"],
        "keywords": ["AI Marketing", "Automation", "Startup Growth"],
        "taboo_topics": ["Overhyped buzzwords", "Aggressive sales pitches"]
    }
