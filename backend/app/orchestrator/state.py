from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class WorkflowState(BaseModel):
    session_id: str
    trace_id: str
    user_id: Optional[str] = None
    current_step: str = "interview"
    missing_facts: List[str] = []
    knowledge_contradictions: List[str] = []
    retry_count: int = 0
    max_retries: int = 2
    
    # Split Knowledge Memory Layers
    brand_memory: Dict[str, Any] = {}
    campaign_memory: Dict[str, Any] = {}
    user_preferences: Dict[str, Any] = {}

class AgentStateManager:
    """Manages active session workflow state, step transitions, and retry budgets."""
    
    def __init__(self):
        self._states: Dict[str, WorkflowState] = {}

    def get_or_create_state(self, session_id: str, trace_id: str) -> WorkflowState:
        if session_id not in self._states:
            self._states[session_id] = WorkflowState(session_id=session_id, trace_id=trace_id)
        return self._states[session_id]

    def update_state(self, session_id: str, **kwargs):
        state = self._states.get(session_id)
        if state:
            for k, v in kwargs.items():
                if hasattr(state, k):
                    setattr(state, k, v)

state_manager = AgentStateManager()
