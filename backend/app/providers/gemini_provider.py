import httpx
import json
from typing import Dict, Any, Optional, AsyncGenerator
from app.providers.base import BaseProvider

class GeminiProvider(BaseProvider):
    """Google Gemini LLM Provider (Gemini 3.6 / 2.5 Flash)."""

    def __init__(self, model_name: str = "gemini-3.6-flash", api_key: Optional[str] = None):
        super().__init__(model_name, api_key)
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

    async def chat(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {"role": "user", "parts": [{"text": user_prompt}]}
            ]
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(self.api_url, json=payload)
            res.raise_for_status()
            data = res.json()
            parts = data["candidates"][0]["content"]["parts"]
            # Find the text part (ignoring thoughts or other metadata if present)
            text_parts = [p["text"] for p in parts if "text" in p]
            return "".join(text_parts)

    async def stream(self, system_prompt: str, user_prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        res = await self.chat(system_prompt, user_prompt, **kwargs)
        yield res

    async def structured_output(self, system_prompt: str, user_prompt: str, schema: Any, **kwargs) -> Dict[str, Any]:
        prompt_with_schema = f"{user_prompt}\n\nRespond ONLY with valid JSON matching this schema:\n{schema}"
        raw = await self.chat(system_prompt, prompt_with_schema, **kwargs)
        # Clean any potential markdown code blocks like ```json ... ```
        clean_raw = raw.strip()
        if clean_raw.startswith("```json"):
            clean_raw = clean_raw[7:]
        elif clean_raw.startswith("```"):
            clean_raw = clean_raw[3:]
        if clean_raw.endswith("```"):
            clean_raw = clean_raw[:-3]
        return json.loads(clean_raw.strip())
