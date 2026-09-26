from pydantic import BaseModel
from typing import List, Optional, Dict

class ChatMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    # optional max tokens etc.
    max_tokens: Optional[int] = None

class ChatResponse(BaseModel):
    reply: str
    model: str
    usage: Optional[Dict] = None
