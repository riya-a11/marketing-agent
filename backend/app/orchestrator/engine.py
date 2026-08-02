import json
import logging
from typing import Dict, Any, Tuple
from app.providers.base import BaseProvider
from app.providers.provider_factory import get_provider
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
        context: Dict[str, Any] = None
    ) -> str:
        prompt_with_ctx = f"Context: {context or {}}\n\nInput: {user_input}"
        output = await self.provider.chat(system_prompt, prompt_with_ctx)
        logger.info(f"[TELEMETRY] Step: {step_name} | Provider: {self.provider.model_name} | Success")
        return output

    async def execute_with_quality_check(
        self,
        gen_system_prompt: str,
        gen_user_input: str,
        review_system_prompt: str,
        min_score: int = settings.MIN_QUALITY_SCORE,
        max_retries: int = 2
    ) -> Tuple[Any, Any]:
        """Runs generation -> evaluation self-correction loop until min_score is met or retries exhausted."""
        current_input = gen_user_input
        retries = 0
        
        while retries <= max_retries:
            raw_gen = await self.execute_step("Generation Step", gen_system_prompt, current_input)
            raw_review = await self.execute_step("Review Step", review_system_prompt, raw_gen)
            
            try:
                gen_data = json.loads(raw_gen)
                review_data = json.loads(raw_review)
                score = review_data.get("overall_score", 100)
            except Exception:
                # Mock output fallback handling
                return json.loads(raw_gen), json.loads(raw_review)
            
            if score >= min_score or retries == max_retries:
                return gen_data, review_data
            
            # Feedback-guided revision step
            feedback = review_data.get("feedback_notes", "Improve brand consistency and call to action.")
            current_input = f"{gen_user_input}\n\nREVISION REQUIRED (Previous Score {score}/{min_score}): {feedback}"
            retries += 1

orchestrator = OrchestratorEngine()
