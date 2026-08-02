import httpx
import logging
from app.config import settings

logger = logging.getLogger("llm_base")

class BaseLLMClient:
    """Provider-independent LLM Client abstraction with fallback mock."""
    
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.nim_key = settings.NVIDIA_NIM_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY

    async def generate_response(self, system_prompt: str, user_prompt: str) -> str:
        # Check if real keys exist, otherwise fall back gracefully to intelligent mock
        if self.openai_key:
            return await self._call_openai(system_prompt, user_prompt)
        elif self.nim_key:
            return await self._call_nvidia_nim(system_prompt, user_prompt)
        else:
            logger.info("No API key configured - running in Provider-Independent Mock Mode")
            return self._mock_fallback(system_prompt, user_prompt)

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "content", "content": user_prompt}
            ]
        }
        async with httpx.AsyncClient() as client:
            res = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]

    async def _call_nvidia_nim(self, system_prompt: str, user_prompt: str) -> str:
        # NVIDIA NIM OpenAI-compatible endpoint
        headers = {
            "Authorization": f"Bearer {self.nim_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "meta/llama-3.1-70b-instruct",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        }
        async with httpx.AsyncClient() as client:
            res = await client.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]

    def _mock_fallback(self, system_prompt: str, user_prompt: str) -> str:
        """Deterministic mock outputs for seamless offline testing."""
        if "Interview Agent" in system_prompt:
            return "That sounds like a great mission! Could you tell me a bit more about your target audience and who your top competitors are?"
        elif "Brand Intelligence" in system_prompt:
            return '{"brand_voice": "Friendly, Professional, Innovative", "tone": "Empowering & Direct", "core_values": "Transparency, Speed, Excellence", "usp": "AI-driven automated marketing for early-stage startups", "keywords": ["AI", "Innovation", "Growth", "Automation"], "avoid_list": ["Jargon", "Overpromising"]}'
        elif "Content Generation" in system_prompt:
            return '''[
                {
                    "variation_no": 1,
                    "platform": "linkedin",
                    "content_text": "🚀 Launching our new feature! Say goodbye to manual social media posts. Our AI Marketing Assistant builds your brand voice in minutes.",
                    "cta": "Try it now at incubation.example.com"
                },
                {
                    "variation_no": 2,
                    "platform": "linkedin",
                    "content_text": "Building a startup is hard. Marketing doesn't have to be. Discover how early-stage founders are staying consistent effortlessly.",
                    "cta": "Read the founder story"
                },
                {
                    "variation_no": 3,
                    "platform": "linkedin",
                    "content_text": "💡 Quick tip for founders: Consistency beats perfection. Automate your messaging pillars with our new incubator tool.",
                    "cta": "Join the cohort"
                }
            ]'''
        return "Generated response based on startup context."

llm_client = BaseLLMClient()
