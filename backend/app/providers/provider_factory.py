from app.config import settings
from app.providers.base import BaseProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.nvidia_provider import NvidiaProvider
from app.providers.mock_provider import MockProvider

def get_provider() -> BaseProvider:
    """Factory function returning active LLM provider or Mock fallback."""
    if settings.OPENAI_API_KEY:
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY)
    elif settings.NVIDIA_NIM_API_KEY:
        return NvidiaProvider(api_key=settings.NVIDIA_NIM_API_KEY)
    else:
        return MockProvider()
