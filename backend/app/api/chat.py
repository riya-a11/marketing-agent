from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse
from app.providers.chat_service import ChatService

router = APIRouter()

chat_service = ChatService()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        response = await chat_service.generate(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
