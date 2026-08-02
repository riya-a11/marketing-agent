import httpx
import json
from typing import Dict, Any, Optional, AsyncGenerator
from app.providers.base import BaseProvider

class OpenAIProvider(BaseProvider):
    def __init__(self, model_name: str = "gpt-4o-mini", api_key: Optional[str] = None):
        super().__init__(model_name, api_key)
        self.api_url = "https://api.openai.com/v1/chat/completions"

    async def chat(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(self.api_url, json=payload, headers=headers, timeout=30.0)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, system_prompt: str, user_prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        # Simple non-stream fallback wrapper for interface compatibility
        res = await self.chat(system_prompt, user_prompt, **kwargs)
        yield res

    async def structured_output(self, system_prompt: str, user_prompt: str, schema: Any, **kwargs) -> Dict[str, Any]:
        prompt_with_schema = f"{user_prompt}\n\nRespond ONLY with valid JSON matching this schema:\n{schema}"
        raw = await self.chat(system_prompt, prompt_with_schema, **kwargs)
        return json.loads(raw)
