import asyncio
from typing import List, Dict

from app.providers.provider_factory import get_provider
from app.models.chat import ChatRequest, ChatResponse

class ChatService:
    """Simple service that forwards chat requests to the configured LLM provider."""

    def __init__(self):
        self.provider = get_provider()

    async def generate(self, request: ChatRequest) -> ChatResponse:
        # Build a simple system prompt (can be extended later)
        system_prompt = "You are a helpful AI assistant."
        # Concatenate user messages into a single user_prompt for the provider.
        # For now we just take the last user message; earlier messages can be added to context if needed.
        user_prompt = ""
        for msg in request.messages:
            if msg.role == "user":
                user_prompt = msg.content
        # Call the provider's async chat method.
        reply = await self.provider.chat(system_prompt, user_prompt)
        # The provider may not expose usage info; we return minimal fields.
        return ChatResponse(reply=reply, model=self.provider.model_name, usage=None)
