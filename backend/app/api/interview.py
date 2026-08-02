import os
import json
from fastapi import APIRouter
from app.models.schemas import InterviewRequest
from app.orchestrator.engine import orchestrator

router = APIRouter(prefix="/interview", tags=["Interview"])

def load_prompt(filename: str) -> str:
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "Default interview system prompt."

@router.post("/message")
async def interview_turn(req: InterviewRequest):
    system_prompt = load_prompt("interview.md")
    raw_res = await orchestrator.execute_step(
        step_name="Adaptive Interview Step",
        system_prompt=system_prompt,
        user_input=req.message,
        context=req.context
    )
    try:
        return json.loads(raw_res)
    except Exception:
        return {"reply": raw_res, "missing_slots": [], "completion_percentage": 50}
