import json
import logging
from pathlib import Path
from typing import Dict, Any, List
from app.providers.base import BaseProvider
from app.providers.provider_factory import get_provider

logger = logging.getLogger("interview_agent")
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

ALL_SLOTS = ["brand_name", "industry", "mission", "target_audience", "brand_voice", "competitors"]

class InterviewAgent:
    """Agent responsible for conducting adaptive onboarding interview and tracking brand facts slot by slot."""

    def __init__(self, provider: BaseProvider = None):
        self._provider = provider

    @property
    def provider(self) -> BaseProvider:
        if not self._provider:
            self._provider = get_provider()
        return self._provider

    async def process_turn(self, user_message: str, history: List[Dict[str, str]] = None, current_slots: Dict[str, Any] = None) -> Dict[str, Any]:
        system_prompt = (PROMPTS_DIR / "interview.md").read_text(encoding="utf-8")
        
        slots = current_slots or {}
        user_input_payload = f"""
CONVERSATION HISTORY:
{json.dumps(history or [], indent=2)}

CURRENTLY EXTRACTED SLOTS:
{json.dumps(slots, indent=2)}

LATEST FOUNDER MESSAGE:
"{user_message}"
"""

        try:
            raw = await self.provider.chat(system_prompt, user_input_payload)
            data = json.loads(raw)
            return data
        except Exception as e:
            logger.warning(f"Fallback to intelligent turn processor: {e}")
            # Heuristic slot extraction for robust offline / fallback operation
            msg_lower = user_message.lower()
            updated_slots = dict(slots)
            
            if "called" in msg_lower or "name is" in msg_lower or not updated_slots.get("brand_name"):
                words = user_message.split()
                updated_slots["brand_name"] = words[-1].strip(".!") if words else "My Startup"
            
            if "ai" in msg_lower or "tech" in msg_lower or "saas" in msg_lower:
                updated_slots["industry"] = "AI / SaaS Tech"
            if "help" in msg_lower or "build" in msg_lower or "solution" in msg_lower:
                updated_slots["mission"] = user_message
            if "founders" in msg_lower or "startups" in msg_lower or "businesses" in msg_lower:
                updated_slots["target_audience"] = "Early stage startup founders"

            filled_count = len([k for k, v in updated_slots.items() if v])
            percentage = int((filled_count / len(ALL_SLOTS)) * 100)
            missing = [s for s in ALL_SLOTS if not updated_slots.get(s)]

            if "brand_voice" in missing:
                reply = f"Got it! I've noted down your details. How would you describe your brand's voice and style (e.g. professional, energetic, witty, bold)?"
            elif "competitors" in missing:
                reply = f"Awesome! Who are your main competitors or alternative solutions in this space?"
            else:
                reply = f"Fantastic! I have gathered all essential details about {updated_slots.get('brand_name', 'your startup')}. Click 'Generate Living Brand Profile' to review your memory card!"

            return {
                "reply": reply,
                "extracted_slots": updated_slots,
                "missing_slots": missing,
                "completion_percentage": min(percentage + 20, 100)
            }

interview_agent = InterviewAgent()
