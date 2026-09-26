import json
from app.providers.base import BaseProvider
from typing import Dict, Any, AsyncGenerator

class MockProvider(BaseProvider):
    """Local offline provider for rapid development, testing, and UI demonstration."""

    def __init__(self, model_name: str = "mock-v1", api_key: str = "mock-key"):
        super().__init__(model_name, api_key)

    async def chat(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        prompt_lower = (system_prompt + " " + user_prompt).lower()

        # Marketing OS Studio — strategic angle analysis (Hero step 1).
        # Keyed before the generic branches so the correct SHAPE is returned offline.
        if "is_worth_marketing" in prompt_lower:
            return json.dumps({
                "update_assessment": "A customer cut reconciliation from days to minutes — a concrete, provable outcome.",
                "is_worth_marketing": True,
                "angles": [
                    {
                        "id": "angle_outcome",
                        "tag": "Customer Outcome",
                        "is_recommended": True,
                        "headline": "Reconcile invoices in 40 minutes instead of 3 days",
                        "rationale": "Leads with a concrete, verifiable customer time saving — the strongest proof for analytical buyers.",
                        "evidence_used": "Verified customer outcome (3 days → 40 minutes)"
                    },
                    {
                        "id": "angle_founder",
                        "tag": "Founder Conviction",
                        "is_recommended": False,
                        "headline": "Why we spent 6 months rebuilding reconciliation from scratch",
                        "rationale": "Builds founder authenticity and behind-the-scenes trust with early adopters.",
                        "evidence_used": "Engineering milestones & problem discovery"
                    },
                    {
                        "id": "angle_proof",
                        "tag": "Data / Technical Proof",
                        "is_recommended": False,
                        "headline": "72% faster reconciliation, now live in production",
                        "rationale": "Authoritative and hard-hitting for data-driven operators.",
                        "evidence_used": "Beta benchmark data"
                    }
                ]
            })

        # Marketing OS Studio — multi-channel campaign package (Hero step 2).
        if "core_thesis" in prompt_lower or "campaign director" in prompt_lower:
            return json.dumps({
                "campaign_title": "Reconciliation, Reinvented",
                "core_thesis": "Turn a 3-day reconciliation grind into a 40-minute task.",
                "channels": {
                    "linkedin": {
                        "post_text": "Reconciliation used to take our customers 3 days.\n\nNow it takes 40 minutes.\n\nThat's not a tweak — it's 72% faster, running in production today. Teams save hundreds of hours every quarter.",
                        "cta": "See the 2-minute walkthrough",
                        "char_count": 320
                    },
                    "x": {
                        "post_text": "Reconciliation: 3 days → 40 minutes.\n\n72% faster, live in production.\n\nHere's how 👇",
                        "cta": "velodynamics.com/launch",
                        "char_count": 150
                    },
                    "instagram": {
                        "visual_headline": "3 DAYS → 40 MINUTES",
                        "caption": "Reconciliation just got 72% faster. Teams save hundreds of hours every quarter.\n\nLink in bio to see it live.",
                        "cta": "Link in bio"
                    },
                    "video": {
                        "title": "Short-Form Product Teaser",
                        "hook_line": "Still reconciling invoices by hand?",
                        "scenes": [
                            {"scene_no": 1, "visual": "Analyst buried in spreadsheets", "voiceover": "Reconciliation used to take three full days."},
                            {"scene_no": 2, "visual": "One-click match inside the dashboard", "voiceover": "Now it takes forty minutes — seventy-two percent faster."},
                            {"scene_no": 3, "visual": "Logo and call to action", "voiceover": "Live in production today."}
                        ]
                    }
                },
                "advisor_critique": [
                    {"status": "passed", "title": "Evidence Grounding", "message": "Anchored in a verifiable customer outcome."},
                    {"status": "action_needed", "title": "CTA Sharpness", "message": "Tighten the CTA to a zero-friction next step.", "suggested_fix": "Read the 2-min breakdown"}
                ]
            })

        if "video" in prompt_lower or "storyboard" in prompt_lower or "reel" in prompt_lower:
            return json.dumps({
                "video_title": "9:16 Reel: Launch Your AI Brand in Minutes",
                "aspect_ratio": "9:16",
                "total_estimated_seconds": 30,
                "full_voiceover_script": "Are you struggling with early stage marketing? Here is how startup founders automate consistent social content in under 5 minutes without hiring agencies.",
                "scenes": [
                    {
                        "scene_number": 1,
                        "duration_seconds": 5,
                        "visual_description": "Vertical 9:16 close-up of a focused founder looking at the camera, dynamic kinetic text overlay pops in.",
                        "text_overlay": "Stop Wasting 20 Hours On Marketing 🚫",
                        "voiceover_text": "Are you struggling with early stage marketing as a solo founder?",
                        "ai_video_prompt": "9:16 vertical video, 4k resolution, cinematic portrait lighting, confident startup founder talking directly to camera, modern startup office background"
                    },
                    {
                        "scene_number": 2,
                        "duration_seconds": 15,
                        "visual_description": "Glowing UI dashboard fast-forward showing automated multi-platform campaign generation.",
                        "text_overlay": "AI Marketing OS For Startups ⚡",
                        "voiceover_text": "Here is how founders automate consistent social content in under 5 minutes.",
                        "ai_video_prompt": "9:16 vertical video, glowing futuristic UI dashboard displaying rapid AI text generation, sleek dark theme with indigo neon accents"
                    },
                    {
                        "scene_number": 3,
                        "duration_seconds": 10,
                        "visual_description": "Smiling founder checking growing post engagement analytics on smartphone.",
                        "text_overlay": "Build Your Living Brand Profile 🚀",
                        "voiceover_text": "Build your living brand memory and launch high-converting campaigns today.",
                        "ai_video_prompt": "9:16 vertical shot, enthusiastic founder pointing at a call to action button, bright vibrant lighting"
                    }
                ]
            })
        elif "interview" in prompt_lower or "onboarding" in prompt_lower:
            return json.dumps({
                "reply": "That sounds like a great mission! Could you tell me a bit more about your primary target audience and top competitors?",
                "extracted_slots": {
                    "brand_name": "NexusAI",
                    "industry": "AI / B2B SaaS",
                    "mission": "Empower early-stage founders with automated marketing.",
                    "target_audience": "Early stage startup founders",
                    "brand_voice": "Friendly, Professional, Authoritative",
                    "competitors": "Traditional agencies"
                },
                "missing_slots": ["brand_voice", "competitors"],
                "completion_percentage": 70
            })
        elif "brand" in prompt_lower:
            return json.dumps({
                "brand_name": "NexusAI",
                "mission": "Empower early-stage founders with automated marketing.",
                "vision": "Empower solo founders to scale marketing effortlessly.",
                "industry": "AI / B2B SaaS",
                "brand_voice": "Authoritative, Energetic, Inspiring",
                "tone": "Confident & Professional",
                "target_audience": "Early stage startup founders & incubator cohort members",
                "buyer_personas": ["Tech Solo Founders", "Incubator Cohort Members"],
                "competitors": ["Traditional Marketing Agencies"],
                "writing_style": "Punchy, value-driven, clear call to actions.",
                "taboo_topics": ["Aggressive sales pressure", "Overhyped corporate jargon"],
                "hashtags": ["#StartupMarketing", "#AIMarketing", "#FounderJourney"],
                "seo_keywords": ["AI marketing assistant", "startup brand identity"],
                "cta_style": "Direct & Action-Oriented"
            })
        elif "content" in prompt_lower or "generation" in prompt_lower:
            return json.dumps([
                {
                    "variation_no": 1,
                    "platform": "linkedin",
                    "content_text": "🚀 Launching our new AI Marketing OS! Say goodbye to manual content creation. Our AI Marketing Assistant builds your brand voice in minutes.",
                    "cta": "Try the interactive demo now",
                    "style_label": "Direct & Punchy"
                },
                {
                    "variation_no": 2,
                    "platform": "linkedin",
                    "content_text": "Building a startup is hard enough. Marketing shouldn't feel like a second full-time job. Here is how incubator cohort founders are automating consistent social content.",
                    "cta": "Read our founder guide",
                    "style_label": "Founder Storytelling"
                },
                {
                    "variation_no": 3,
                    "platform": "linkedin",
                    "content_text": "💡 3 Marketing Mistakes early-stage founders make:\n1. Inconsistent messaging\n2. Ignoring buyer personas\n3. Relying on manual scheduling\n\nFix them with our incubation AI module.",
                    "cta": "Explore the toolkit",
                    "style_label": "Educational & Insight"
                }
            ])
        elif "review" in prompt_lower:
            return json.dumps({
                "overall_score": 92,
                "breakdown": {
                    "grammar": 95,
                    "brand_voice": 90,
                    "readability": 94,
                    "cta_quality": 89
                },
                "feedback_notes": "Strong clarity and punchy call to action. Fits the professional tone."
            })
        return "Generated response based on startup context."

    async def stream(self, system_prompt: str, user_prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        full_text = await self.chat(system_prompt, user_prompt, **kwargs)
        yield full_text

    async def structured_output(self, system_prompt: str, user_prompt: str, schema: Any, **kwargs) -> Dict[str, Any]:
        raw = await self.chat(system_prompt, user_prompt, **kwargs)
        try:
            return json.loads(raw)
        except Exception:
            return {"output": raw}
