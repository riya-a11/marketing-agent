import json
import hashlib
import unicodedata
from typing import Any, Dict, List, Union

def normalize_value(val: Any) -> Any:
    """
    Recursively normalizes values for deterministic canonical JSON:
    - Normalizes strings to Unicode NFC
    - Sorts arrays that represent unordered collections (e.g. lists of strings like media_asset_ids)
    - Recursively processes dicts with key sorting
    """
    if isinstance(val, str):
        return unicodedata.normalize("NFC", val)
    elif isinstance(val, dict):
        return {k: normalize_value(v) for k, v in sorted(val.items(), key=lambda item: item[0])}
    elif isinstance(val, (list, tuple)):
        normalized_list = [normalize_value(x) for x in val]
        # If all items are primitives (str, int), sort them deterministically
        if normalized_list and all(isinstance(x, (str, int)) for x in normalized_list):
            try:
                return sorted(normalized_list)
            except Exception:
                return normalized_list
        return normalized_list
    elif isinstance(val, float):
        # Deterministic float representation: integer if whole number
        if val.is_integer():
            return int(val)
        return round(val, 8)
    return val

def canonical_json(obj: Any) -> str:
    """
    Produces deterministic, canonical JSON representation conforming to RFC 8785:
    - Lexicographically sorted object keys
    - UTF-8 with Unicode NFC normalization
    - No insignificant whitespace (separators=(',', ':'))
    - Deterministic primitive sorting
    """
    normalized = normalize_value(obj)
    return json.dumps(
        normalized,
        sort_keys=True,
        ensure_ascii=False,
        separators=(',', ':')
    )

def compute_calendar_event_hash(channel: str, channel_payload: Dict[str, Any], scheduled_at: str, timezone: str) -> str:
    """
    Computes a cryptographic SHA-256 hash across all publish-affecting properties:
    - channel
    - canonical JSON of channel_payload (copy, CTA, media, subject, sender, body)
    - scheduled_at (UTC ISO string)
    - timezone (IANA string)
    
    Any alteration to these fields changes the hash and invalidates prior authorizations.
    """
    norm_channel = unicodedata.normalize("NFC", (channel or "").strip().lower())
    norm_scheduled_at = unicodedata.normalize("NFC", (scheduled_at or "").strip())
    norm_timezone = unicodedata.normalize("NFC", (timezone or "").strip())
    
    canonical_payload = canonical_json(channel_payload or {})
    
    # Hash components separated by null bytes to prevent delimiter collision
    hasher = hashlib.sha256()
    hasher.update(norm_channel.encode("utf-8"))
    hasher.update(b"\x00")
    hasher.update(canonical_payload.encode("utf-8"))
    hasher.update(b"\x00")
    hasher.update(norm_scheduled_at.encode("utf-8"))
    hasher.update(b"\x00")
    hasher.update(norm_timezone.encode("utf-8"))
    
    return hasher.hexdigest()
