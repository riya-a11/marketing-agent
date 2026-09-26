import json
import re
from typing import Any

def extract_and_parse_json(raw_text: str) -> Any:
    """Robustly extracts and parses JSON from raw LLM responses, stripping code fences or prefix/suffix text."""
    clean = raw_text.strip()
    
    # Try direct parse
    try:
        return json.loads(clean)
    except Exception:
        pass

    # Extract content inside ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean, re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except Exception:
            pass

    # Try finding the first '{' and last '}' or '[' and ']'
    first_brace = clean.find("{")
    last_brace = clean.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(clean[first_brace:last_brace+1])
        except Exception:
            pass

    first_bracket = clean.find("[")
    last_bracket = clean.rfind("]")
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        try:
            return json.loads(clean[first_bracket:last_bracket+1])
        except Exception:
            pass

    raise ValueError(f"Could not parse JSON from output: {raw_text[:200]}...")
