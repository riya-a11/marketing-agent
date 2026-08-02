from app.providers.base import BaseProvider
from typing import Dict, Any

class MockProvider(BaseProvider):
    """Local offline provider for rapid development, testing, and UI demonstration."""

    def __init__(self, model_name: str = "mock-v1", api_key: str = "mock-key"):
        super().__init__(model_name, api_key)

    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        if "Missing Information Detector" in system_prompt or "Interview Agent" in system_prompt:
            return '{"reply": "That sounds like a compelling vision! Could you tell me a bit about your ideal target audience and primary competitors?", "missing_slots": ["target_audience", "competitors"], "completion_percentage": 40}'
        elif "Brand Intelligence" in system_prompt:
            return '''{
                "brand_name": "NexusAI",
                "mission": "Empower early-stage founders with automated marketing.",
                "vision": "Every startup has high online visibility.",
                "industry": "Artificial Intelligence / B2B SaaS",
                "audience": {"primary": "Tech founders", "secondary": "Incubator managers"},
                "buyer_personas": ["Busy Solo Founder", "Non-technical CEO"],
                "competitors": ["Copy.ai", "Jasper"],
                "brand_voice": "Friendly, Professional, Authoritative",
                "writing_style": "Concise and action-oriented",
                "personality": ["Innovative", "Empathetic", "Direct"],
                "taboo_topics": ["Overhyped buzzwords", "Negative competitor remarks"],
                "hashtags": ["#StartupGrowth", "#AIMarketing", "#Founders"],
                "seo_keywords": ["AI Marketing", "Startup Content", "Brand Identity"],
                "pain_points": ["Lack of time", "Inconsistent messaging"],
                "goals": ["Build early community", "Generate qualified leads"],
                "platform_preferences": {"linkedin": "Thought leadership", "x": "Punchy tips"},
                "cta_style": "Direct & Value-driven",
                "examples": ["Say goodbye to manual social media scheduling."]
            }'''
        elif "Content Generation" in system_prompt:
            return '''[
                {
                    "variation_no": 1,
                    "platform": "linkedin",
                    "content_text": "🚀 Launching NexusAI! Say goodbye to manual content creation. Our AI Marketing Operating System helps founders post on-brand in minutes.",
                    "cta": "Try the interactive demo now",
                    "style_label": "Direct & Punchy"
                },
                {
                    "variation_no": 2,
                    "platform": "linkedin",
                    "content_text": "Building a company is hard enough. Marketing shouldn't feel like a second full-time job. Here is how top incubation founders automate consistency.",
                    "cta": "Read our founder guide",
                    "style_label": "Story-driven"
                },
                {
                    "variation_no": 3,
                    "platform": "linkedin",
                    "content_text": "💡 3 Marketing Mistakes early-stage founders make:\\n1. Inconsistent messaging\\n2. Ignoring target personas\\n3. Form-heavy tools\\n\\nHere is how to fix them effortlessly.",
                    "cta": "Explore the toolkit",
                    "style_label": "Educational"
                }
            ]'''
        elif "Review Engine" in system_prompt:
            return '''{
                "overall_score": 92,
                "breakdown": {
                    "grammar": 95,
                    "brand_voice": 90,
                    "readability": 92,
                    "cta_quality": 90
                },
                "feedback_notes": "Strong clarity and punchy call to action. Fits the professional tone."
            }'''
        return "Generic mock output response."

    async def stream(self, system_prompt: str, user_prompt: str, **kwargs):
        full_text = await self.generate(system_prompt, user_prompt, **kwargs)
        for word in full_text.split(" "):
            yield word + " "
