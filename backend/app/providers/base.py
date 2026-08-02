from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, AsyncGenerator

class BaseProvider(ABC):
    """Production BaseProvider Interface with full multimodal, structured, & function call signatures."""
    
    def __init__(self, model_name: str, api_key: Optional[str] = None):
        self.model_name = model_name
        self.api_key = api_key

    @abstractmethod
    async def chat(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Standard chat response."""
        pass

    @abstractmethod
    async def stream(self, system_prompt: str, user_prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        """Streaming response generator."""
        pass

    @abstractmethod
    async def structured_output(self, system_prompt: str, user_prompt: str, schema: Any, **kwargs) -> Dict[str, Any]:
        """Returns validated structured JSON output conforming to pydantic/json schema."""
        pass

    async def embeddings(self, text: str) -> list[float]:
        """Vector embedding calculation."""
        raise NotImplementedError("Embeddings not implemented for this provider.")

    async def vision(self, image_url: str, prompt: str, **kwargs) -> str:
        """Multimodal image/vision processing."""
        raise NotImplementedError("Vision capability not supported by this provider model.")

    async def video(self, prompt: str, duration: int = 5, **kwargs) -> Dict[str, Any]:
        """Modular Video generation interface (Phase 2)."""
        raise NotImplementedError("Video capability not supported by this provider model.")

    async def tool_call(self, tools: list, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Tool/Function calling execution interface."""
        raise NotImplementedError("Tool calling not implemented for this provider.")
