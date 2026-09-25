import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import dateutil.parser

logger = logging.getLogger("calendar_validation_engine")

SUPPORTED_CHANNELS = {
    "linkedin": {"name": "LinkedIn", "max_chars": 3000, "requires_media": False},
    "x": {"name": "X (Twitter)", "max_chars": 280, "requires_media": False},
    "twitter": {"name": "X (Twitter)", "max_chars": 280, "requires_media": False},
    "instagram": {"name": "Instagram", "max_chars": 2200, "requires_media": True},
    "youtube": {"name": "YouTube Shorts & Videos", "max_chars": 5000, "requires_media": True},
    "email": {"name": "Email Newsletter", "max_chars": None, "requires_media": False},
    "video": {"name": "Short Video", "max_chars": None, "requires_media": False}
}

class CalendarValidationEngine:
    """
    Authoritative Calendar Validation Engine:
    Evaluates calendar events across 5 validation dimensions with formal severity levels:
    - ERROR: Hard rule violation. Blocks preview confirmation / publishing.
    - WARNING: Soft policy notice (e.g. short-notice window, duplicate candidate). Requires user sign-off.
    - INFO: Informational advice.
    """

    def validate_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        errors: List[str] = []
        warnings: List[str] = []
        info: List[str] = []

        title = str(event_data.get("title") or "").strip()
        channel = str(event_data.get("channel") or "linkedin").strip().lower()
        raw_scheduled_at = event_data.get("scheduled_at")
        timezone_str = str(event_data.get("timezone") or "Asia/Kolkata").strip()
        channel_payload = event_data.get("channel_payload") or {}
        content_text = str(event_data.get("content_text") or channel_payload.get("post_text") or channel_payload.get("caption") or channel_payload.get("source_body") or "").strip()

        # 1. Required Fields Check
        if not title and not content_text:
            errors.append("Required field missing: Event must have a title or content body.")

        if not raw_scheduled_at:
            errors.append("Required field missing: Scheduled date & time is required.")

        # 2. Supported Channels Check
        if channel not in SUPPORTED_CHANNELS:
            errors.append(f"Unsupported channel '{channel}'. Allowed channels: linkedin, x, instagram, email, video.")
        else:
            channel_spec = SUPPORTED_CHANNELS[channel]
            
            # Character Limit Validation
            max_chars = channel_spec["max_chars"]
            if max_chars and len(content_text) > max_chars:
                errors.append(f"Content length ({len(content_text)} chars) exceeds {channel_spec['name']} maximum limit of {max_chars} characters.")

            # Media Requirement Validation
            if channel_spec["requires_media"] and not event_data.get("media_asset") and not channel_payload.get("media_asset_ids") and not event_data.get("media_url"):
                errors.append(f"Channel '{channel_spec['name']}' requires at least one image or video attachment.")

            # Special Email Requirements
            if channel == "email":
                subject = channel_payload.get("subject") or title
                if not subject:
                    errors.append("Email campaign requires a subject line.")

        # 3. Date, Time & Timezone Validation
        parsed_utc_dt = None
        if raw_scheduled_at:
            try:
                dt = dateutil.parser.parse(str(raw_scheduled_at))
                if dt.tzinfo is None:
                    parsed_utc_dt = dt.replace(tzinfo=timezone.utc)
                else:
                    parsed_utc_dt = dt.astimezone(timezone.utc)
                
                now_utc = datetime.now(timezone.utc)

                # Past Date Check
                if parsed_utc_dt < now_utc:
                    errors.append(f"Scheduled time '{parsed_utc_dt.isoformat()}' is in the past. Must be a future timestamp.")
                # Short Notice Check (< 30 minutes in future)
                elif parsed_utc_dt < (now_utc + timedelta(minutes=30)):
                    warnings.append(f"Short-notice schedule: Post is scheduled within 30 minutes of current time ({parsed_utc_dt.strftime('%H:%M UTC')}).")

            except Exception as e:
                errors.append(f"Invalid date format '{raw_scheduled_at}': {str(e)}")

        is_valid = len(errors) == 0
        status = "error" if errors else ("warning" if warnings else "valid")

        return {
            "is_valid": is_valid,
            "status": status,
            "errors": errors,
            "warnings": warnings,
            "info": info,
            "parsed_scheduled_at_utc": parsed_utc_dt.isoformat() if parsed_utc_dt else None
        }

    def evaluate_schedule_conflict(
        self,
        event_a_scheduled_utc: str,
        event_b_scheduled_utc: str,
        window_minutes: int = 15
    ) -> bool:
        """
        Conflict detection against normalized UTC instants (±15-minute window).
        """
        try:
            dt_a = dateutil.parser.parse(event_a_scheduled_utc).astimezone(timezone.utc)
            dt_b = dateutil.parser.parse(event_b_scheduled_utc).astimezone(timezone.utc)
            diff_seconds = abs((dt_a - dt_b).total_seconds())
            return diff_seconds <= (window_minutes * 60)
        except Exception:
            return False
