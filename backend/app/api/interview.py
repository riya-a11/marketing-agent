from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.agents.interview_agent import interview_agent

router = APIRouter(prefix="/interview", tags=["Interview"])

class ConversationTurnRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []
    current_slots: Optional[Dict[str, Any]] = {}

@router.post("/message")
async def interview_turn(req: ConversationTurnRequest):
    """Processes a conversational turn in the founder onboarding interview, extracts facts, and updates progress."""
    try:
        res = await interview_agent.process_turn(
            user_message=req.message,
            history=req.history,
            current_slots=req.current_slots
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
