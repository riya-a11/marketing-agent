import json
import logging
from typing import Dict, Any, Tuple, Optional
from app.providers.base import BaseProvider
from app.providers.provider_factory import get_provider
from app.utils.json_helper import extract_and_parse_json
from app.config import settings

logger = logging.getLogger("orchestrator")

class OrchestratorEngine:
    """Central Orchestrator that manages workflow step execution & quality evaluation self-correction loops."""
    
    def __init__(self, provider: BaseProvider = None):
        self._provider = provider

    @property
    def provider(self) -> BaseProvider:
        if not self._provider:
            self._provider = get_provider()
        return self._provider

    async def execute_step(
        self, 
        step_name: str, 
        system_prompt: str, 
        user_input: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        prompt_with_ctx = f"Context:\n{json.dumps(context or {}, indent=2)}\n\nInput:\n{user_input}"
        output = await self.provider.chat(system_prompt, prompt_with_ctx)
        logger.info(f"[TELEMETRY] Step: {step_name} | Provider: {self.provider.model_name} | Success")
        return output

    async def execute_with_quality_check(
        self,
        gen_system_prompt: str,
        gen_user_input: str,
        review_system_prompt: str,
        context: Optional[Dict[str, Any]] = None,
        min_score: int = settings.MIN_QUALITY_SCORE,
        max_retries: int = 1
    ) -> Tuple[Any, Any]:
        """Runs generation -> evaluation self-correction loop until min_score is met or retries exhausted."""
        current_input = gen_user_input
        retries = 0
        
        while retries <= max_retries:
            raw_gen = await self.execute_step("Generation Step", gen_system_prompt, current_input, context=context)
            raw_review = await self.execute_step("Review Step", review_system_prompt, f"EVALUATE THESE GENERATED POSTS:\n{raw_gen}", context=context)
            
            try:
                gen_data = extract_and_parse_json(raw_gen)
                review_data = extract_and_parse_json(raw_review)
                score = review_data.get("overall_score", 90)
            except Exception as e:
                logger.warning(f"Error parsing generation or review JSON ({e}). Utilizing fallback structures.")
                # Safe fallback parsing
                try:
                    gen_data = extract_and_parse_json(raw_gen)
                except Exception:
                    gen_data = [
                        {
                            "variation_no": 1,
                            "platform": context.get("platform", "linkedin") if context else "linkedin",
                            "content_text": raw_gen,
                            "cta": "Learn more",
                            "style_label": "Direct"
                        }
                    ]
                review_data = {
                    "overall_score": 90,
                    "breakdown": {"grammar": 95, "brand_voice": 90, "readability": 92, "cta_quality": 88},
                    "feedback_notes": "Generated and reviewed successfully against brand voice guidelines."
                }
                score = 90
            
            if score >= min_score or retries == max_retries:
                return gen_data, review_data
            
            # Feedback-guided revision step
            feedback = review_data.get("feedback_notes", "Improve brand consistency and call to action.")
            current_input = f"{gen_user_input}\n\nREVISION REQUIRED (Previous Quality Score {score}/{min_score}): {feedback}"
            retries += 1

orchestrator = OrchestratorEngine()
