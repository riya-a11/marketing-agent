import os
from fastapi import APIRouter
from app.models.schemas import ContentGenerateRequest
from app.orchestrator.engine import orchestrator

router = APIRouter(prefix="/content", tags=["Content Generation"])

def load_prompt(filename: str) -> str:
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "Default system prompt."

@router.post("/generate")
async def generate_content(req: ContentGenerateRequest):
    gen_prompt = load_prompt("generation.md")
    review_prompt = load_prompt("review.md")
    
    user_input = f"Content Type: {req.content_type}, Platform: {req.platform}, Profile ID: {req.brand_profile_id}"
    
    variations, review_scorecard = await orchestrator.execute_with_quality_check(
        gen_system_prompt=gen_prompt,
        gen_user_input=user_input,
        review_system_prompt=review_prompt
    )

    return {
        "variations": variations,
        "review_evaluation": review_scorecard
    }
