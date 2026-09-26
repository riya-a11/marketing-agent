import logging
from typing import Dict, Any, AsyncGenerator, List, Optional
from app.config import settings
from app.providers.base import BaseProvider
from app.providers.nvidia_provider import NvidiaProvider
from app.providers.gemini_provider import GeminiProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.mock_provider import MockProvider

logger = logging.getLogger("provider_factory")

class ChainedFallbackProvider(BaseProvider):
    """
    Orchestrates LLM calls with resilient cascade fallback:
    1. NVIDIA NIM
    2. Google Gemini
    3. OpenAI
    4. Mock Provider Fallback
    """

    def __init__(self, providers: List[BaseProvider]):
        primary_model = providers[0].model_name if providers else "mock"
        super().__init__(model_name=primary_model)
        self.providers = providers

    async def chat(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        last_error = None
        for p in self.providers:
            try:
                logger.info(f"Attempting LLM call via {p.__class__.__name__} ({p.model_name})...")
                res = await p.chat(system_prompt, user_prompt, **kwargs)
                return res
            except Exception as e:
                logger.warning(f"Provider {p.__class__.__name__} failed: {e}. Cascading to next provider...")
                last_error = e
        
        # Fallback to Mock if all failed
        mock = MockProvider()
        return await mock.chat(system_prompt, user_prompt, **kwargs)

    async def stream(self, system_prompt: str, user_prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        res = await self.chat(system_prompt, user_prompt, **kwargs)
        yield res

    async def structured_output(self, system_prompt: str, user_prompt: str, schema: Any, **kwargs) -> Dict[str, Any]:
        last_error = None
        for p in self.providers:
            try:
                res = await p.structured_output(system_prompt, user_prompt, schema, **kwargs)
                return res
            except Exception as e:
                logger.warning(f"Structured output failed for {p.__class__.__name__}: {e}. Cascading...")
                last_error = e
        
        mock = MockProvider()
        return await mock.structured_output(system_prompt, user_prompt, schema, **kwargs)

def get_provider() -> BaseProvider:
    """Returns a resilient ChainedFallbackProvider ordered: NIM -> Gemini -> OpenAI -> Mock."""
    active_chain: List[BaseProvider] = []
    
    if settings.NVIDIA_NIM_API_KEY:
        active_chain.append(NvidiaProvider(api_key=settings.NVIDIA_NIM_API_KEY))
    if settings.GEMINI_API_KEY:
        active_chain.append(GeminiProvider(api_key=settings.GEMINI_API_KEY))
    if settings.OPENAI_API_KEY:
        active_chain.append(OpenAIProvider(api_key=settings.OPENAI_API_KEY))
    
    if not active_chain:
        return MockProvider()
    
    return ChainedFallbackProvider(active_chain)
