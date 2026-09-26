import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends

from app.models.schemas import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarApprovalRequest,
    CalendarRejectRequest,
    BulkApprovalRequest,
    IngestConfirmRequest,
    AIScheduleProposalRequest,
    AIScheduleProposalResponse,
    ProposedEventItem
)
from app.storage.db import (
    create_calendar_event,
    get_calendar_events,
    get_calendar_event_by_id,
    update_calendar_event,
    delete_calendar_event,
    duplicate_calendar_event,
    approve_calendar_event,
    reject_calendar_event,
    bulk_approve_calendar_events,
    get_verification_audit_logs_for_event,
    get_active_brand_profile
)
from app.services.calendar.ingestion_service import parse_tabular_data, parse_document_data
from app.services.calendar.scheduler_worker import process_due_calendar_events
from app.orchestrator.engine import orchestrator
from app.middleware.security import get_current_user, get_workspace_context, require_role, AuthenticatedUser

logger = logging.getLogger("calendar_api")

router = APIRouter(prefix="/calendar", tags=["Marketing Calendar & Verification Gate"])

@router.get("/events")
def list_calendar_events(
    workspace_id: str = Depends(get_workspace_context),
    user: AuthenticatedUser = Depends(get_current_user),
    org_id: Optional[str] = Query(None),
    brand_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Fetches calendar events with tenant/brand scoping and status filters."""
    events = get_calendar_events(
        org_id=org_id,
        brand_id=brand_id,
        status=status,
        channel=channel,
        start_date=start_date,
        end_date=end_date
    )
    
    # If empty, seed initial grounded sample events for demonstration
    if not events and not brand_id:
        seed_now = datetime.utcnow()
        sample_events = [
            {
                "org_id": "org_velo",
                "brand_id": "velo",
                "title": "3 Days to 40 Min Reconciliation Case Study",
                "channel": "linkedin",
                "scheduled_at": (seed_now + timedelta(days=1, hours=2)).isoformat(),
                "timezone": "Asia/Kolkata",
                "status": "PENDING_VERIFICATION",
                "channel_payload": {
                    "post_text": "A customer reduced invoice reconciliation from 3 days to 40 minutes using our new matching engine.\n\nHere is how enterprise finance teams are eliminating manual review friction:",
                    "cta": "Read the full case study ->",
                    "media_asset_ids": []
                },
                "created_by": "founder@velodynamics.com"
            },
            {
                "org_id": "org_velo",
                "brand_id": "velo",
                "title": "Weekly Newsletter: Autonomous Ledger Engine v2",
                "channel": "email",
                "scheduled_at": (seed_now + timedelta(days=3, hours=4)).isoformat(),
                "timezone": "Asia/Kolkata",
                "status": "PENDING_VERIFICATION",
                "channel_payload": {
                    "sender_name": "Velo Dynamics Founder",
                    "subject": "How we cut ledger closing times by 72%",
                    "preview_text": "The architecture behind our zero-downtime reconciliation pipeline.",
                    "source_format": "markdown",
                    "source_body": "Hey there,\n\nWe just launched our v2 ledger matching engine.\n\nKey takeaways:\n- 72% faster closing times.\n- Continuous reconciliation without batch locks.\n- Enterprise-grade SOC2 type II audit trails.\n\nExplore our interactive live benchmark below.",
                    "rendered_html": "<div style='font-family: sans-serif; line-height: 1.6; max-width: 600px;'><h2 style='color: #4f46e5;'>Velo Dynamics Update</h2><p>Hey there,</p><p>We just launched our v2 ledger matching engine.</p><ul><li>72% faster closing times.</li><li>Continuous reconciliation without batch locks.</li></ul><p><a href='https://velodynamics.com/benchmark' style='background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;'>View Benchmark &rarr;</a></p></div>",
                    "plain_text_fallback": "We just launched our v2 ledger matching engine. 72% faster closing times.",
                    "cta_button_text": "View Live Benchmark",
                    "cta_url": "https://velodynamics.com/benchmark"
                },
                "created_by": "founder@velodynamics.com"
            },
            {
                "org_id": "org_velo",
                "brand_id": "velo",
                "title": "Short-Form Video: Manual vs Automated Reconciliation",
                "channel": "video",
                "scheduled_at": (seed_now + timedelta(days=5, hours=1)).isoformat(),
                "timezone": "Asia/Kolkata",
                "status": "PENDING_VERIFICATION",
                "channel_payload": {
                    "title": "9:16 Short-Form Founder Teaser",
                    "hook_line": "Still spending 3 days closing your quarterly books?",
                    "aspect_ratio": "9:16",
                    "scenes": [
                        {"scene_no": 1, "visual": "Spreadsheet horror story", "voiceover": "Still spending 3 days closing books?"},
                        {"scene_no": 2, "visual": "Velo UI matching in 40 mins", "voiceover": "Here is how automated ledgers do it in 40 minutes."}
                    ]
                },
                "created_by": "founder@velodynamics.com"
            }
        ]
        for s in sample_events:
            create_calendar_event(s)
        return get_calendar_events(org_id=org_id, brand_id=brand_id)
        
    return events

@router.post("/events")
def create_event(payload: CalendarEventCreate):
    """Creates a new calendar event in DRAFT or PENDING_VERIFICATION."""
    try:
        created = create_calendar_event(payload.dict())
        return created
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/events/{event_id}")
def get_event(event_id: str):
    """Gets details for a single calendar event."""
    event = get_calendar_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.patch("/events/{event_id}")
def update_event(event_id: str, payload: CalendarEventUpdate):
    """
    Updates calendar event timing or content.
    If content or scheduled time changed, increments version and invalidates prior approvals.
    Rejects modification of PUBLISHED historical events with 409 Conflict.
    """
    try:
        updates = {k: v for k, v in payload.dict().items() if v is not None}
        updated = update_calendar_event(event_id, updates)
        return updated
    except PermissionError as pe:
        raise HTTPException(status_code=409, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/events/{event_id}")
def delete_event(event_id: str):
    """
    Deletes an unverified or draft calendar event.
    Rejects deletion of PUBLISHED events with 409 Conflict.
    """
    try:
        success = delete_calendar_event(event_id)
        if not success:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"status": "deleted", "id": event_id}
    except PermissionError as pe:
        raise HTTPException(status_code=409, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/events/{event_id}/duplicate")
def duplicate_event(event_id: str):
    """Forks an existing or published event into a new fresh DRAFT."""
    try:
        forked = duplicate_calendar_event(event_id)
        return {"status": "duplicated", "event": forked}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/events/{event_id}/approve")
def approve_event(
    event_id: str,
    payload: CalendarApprovalRequest,
    workspace_id: str = Depends(get_workspace_context),
    user: AuthenticatedUser = Depends(require_role("COMPLIANCE_OFFICER", "ADMIN"))
):
    """
    Strict Human-in-the-Loop Sign-Off Endpoint:
    - Validates version and canonical hash match current DB state (Optimistic Concurrency).
    - Transitions to APPROVED -> SCHEDULED if scheduled_at > now.
    - If scheduled_at <= now, requires immediate_action='DISPATCH_NOW' or rescheduled_at.
    - Records immutable sign-off audit log.
    """
    try:
        approved = approve_calendar_event(
            event_id=event_id,
            content_version=payload.content_version,
            content_hash=payload.content_hash,
            user_id=user.id,
            user_role=user.role,
            immediate_action=payload.immediate_action,
            rescheduled_at=payload.rescheduled_at,
            notes=payload.notes
        )
        return {"status": "approved", "event": approved}
    except ValueError as ve:
        raise HTTPException(status_code=409, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/events/{event_id}/reject")
def reject_event(
    event_id: str,
    payload: CalendarRejectRequest,
    workspace_id: str = Depends(get_workspace_context),
    user: AuthenticatedUser = Depends(require_role("COMPLIANCE_OFFICER", "ADMIN"))
):
    """Rejects event and records feedback notes in audit log."""
    try:
        rejected = reject_calendar_event(
            event_id=event_id,
            reason=payload.reason,
            user_id=user.id,
            user_role=user.role
        )
        return {"status": "rejected", "event": rejected}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/events/bulk-approve")
def bulk_approve(
    payload: BulkApprovalRequest,
    workspace_id: str = Depends(get_workspace_context),
    user: AuthenticatedUser = Depends(require_role("COMPLIANCE_OFFICER", "ADMIN"))
):
    """Transactional bulk approval with per-item validation report."""
    res = bulk_approve_calendar_events(
        items=[item.dict() for item in payload.items],
        user_id=user.id,
        user_role=user.role
    )
    return res

@router.get("/events/{event_id}/audit-logs")
def get_event_audit_logs(event_id: str):
    """Fetches the immutable human verification and mutation history for an event."""
    logs = get_verification_audit_logs_for_event(event_id)
    return {"event_id": event_id, "logs": logs}

# ---------------------------------------------------------------------------
# File Ingestion Endpoints (Tier 1 & Tier 2)
# ---------------------------------------------------------------------------

@router.post("/ingest/parse")
async def ingest_parse_file(
    file: UploadFile = File(...),
    timezone: str = Form("Asia/Kolkata")
):
    """
    Parses uploaded schedule file (.xlsx, .csv, .tsv, .txt, .docx, .pdf).
    Detects column mapping, validates per-row dates and channels, returns review table data.
    """
    filename = file.filename.lower()
    content_bytes = await file.read()
    
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
    try:
        if filename.endswith((".csv", ".tsv", ".xlsx")):
            res = parse_tabular_data(content_bytes, file.filename, timezone)
        elif filename.endswith((".txt", ".md", ".docx", ".pdf")):
            res = parse_document_data(content_bytes, file.filename, timezone)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {file.filename}. Please upload .xlsx, .csv, .txt, .docx, or .pdf.")
            
        return res
    except Exception as e:
        logger.error(f"File ingestion error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

@router.post("/ingest/confirm")
def ingest_confirm_rows(payload: IngestConfirmRequest):
    """
    Commits validated rows into calendar as PENDING_VERIFICATION events.
    Enforces that file ingestion confirmation does NOT equal publishing authorization.
    """
    created_events = []
    for r in payload.rows:
        if r.status == "error":
            continue # Skip unresolved error rows
            
        channel = r.channel.lower()
        if channel == "email":
            channel_payload = {
                "sender_name": "Brand Team",
                "subject": r.subject or r.title,
                "preview_text": r.content_text[:120] if r.content_text else "",
                "source_format": "markdown",
                "source_body": r.content_text,
                "rendered_html": f"<div style='font-family: sans-serif; line-height: 1.6;'><h2>{r.subject or r.title}</h2><p>{r.content_text}</p></div>",
                "plain_text_fallback": r.content_text,
                "cta_button_text": r.cta or "Learn More",
                "cta_url": "https://brand.com"
            }
        elif channel == "video":
            channel_payload = {
                "title": r.title,
                "hook_line": r.content_text[:80],
                "aspect_ratio": "9:16",
                "scenes": [
                    {"scene_no": 1, "visual": "Core demonstration", "voiceover": r.content_text}
                ]
            }
        else:
            channel_payload = {
                "post_text": r.content_text,
                "cta": r.cta or "",
                "media_asset_ids": []
            }
            
        event_dict = {
            "org_id": payload.org_id or "org_velo",
            "brand_id": payload.brand_id or "velo",
            "title": r.title,
            "channel": channel,
            "scheduled_at": r.scheduled_at,
            "timezone": r.timezone or "Asia/Kolkata",
            "status": "PENDING_VERIFICATION",
            "channel_payload": channel_payload,
            "created_by": "file_ingestion"
        }
        created = create_calendar_event(event_dict)
        created_events.append(created)
        
    return {
        "status": "committed",
        "total_committed": len(created_events),
        "events": created_events
    }

# ---------------------------------------------------------------------------
# AI Natural Language Schedule Interpreter (Tier 3)
# ---------------------------------------------------------------------------

@router.post("/propose-schedule", response_model=AIScheduleProposalResponse)
async def propose_schedule_from_prompt(req: AIScheduleProposalRequest):
    """
    AI Natural Language Schedule Interpreter:
    Extracts cadence, dates, channels, and hooks from prompt.
    Returns a structured proposal with EXPLICIT operational assumptions for user sign-off.
    """
    brand_memory = req.brand_memory or get_active_brand_profile() or {}
    brand_name = brand_memory.get("brand_name", "Velo Dynamics")
    timezone_str = req.timezone or "Asia/Kolkata"
    
    system_prompt = f"""You are the Master Marketing Strategist and Scheduler for {brand_name}.
Given the user's natural language scheduling request, generate a structured posting proposal.
Timezone: {timezone_str}

CRITICAL RULES:
1. State all operational assumptions explicitly in the 'assumptions' array (e.g. 'Morning posts mapped to 09:30 AM IST', '3 posts per week slotted on Mon, Wed, Fri').
2. Flag any draft hooks containing numerical or factual claims as 'has_factual_claims: true'.
3. Output STRICT JSON adhering to this schema:
{{
  "summary": "Brief 1-sentence schedule summary",
  "assumptions": ["Assumption 1", "Assumption 2"],
  "ambiguities": [],
  "proposed_events": [
    {{
      "temp_id": "p1",
      "channel": "linkedin",
      "days_from_now": 2,
      "time_hour_24": 9,
      "time_minute": 30,
      "title": "Punchy Event Title",
      "draft_hook": "Hook copy addressing founder pain points",
      "cta": "Read the breakdown",
      "has_factual_claims": false
    }}
  ]
}}"""

    proposal_id = f"prop_{uuid.uuid4().hex[:10]}"
    fallback_now = datetime.utcnow()
    
    fallback_events = [
        ProposedEventItem(
            temp_id="p1",
            channel="linkedin",
            scheduled_at=(fallback_now + timedelta(days=2, hours=4)).isoformat(),
            display_time=f"{(fallback_now + timedelta(days=2)).strftime('%b %d, %Y')} 09:30 AM {timezone_str}",
            title=f"{brand_name} Milestone Announcement",
            draft_hook="Most teams lose hours every single week to repetitive manual tasks.",
            cta="Try the interactive walkthrough",
            has_factual_claims=False,
            claims_status="UNVERIFIED_CLAIMS"
        ),
        ProposedEventItem(
            temp_id="p2",
            channel="x",
            scheduled_at=(fallback_now + timedelta(days=4, hours=6)).isoformat(),
            display_time=f"{(fallback_now + timedelta(days=4)).strftime('%b %d, %Y')} 11:30 AM {timezone_str}",
            title="Behind the Scenes Architecture",
            draft_hook="How we engineered zero-friction automation with grounded evidence verification.",
            cta="Full details below 👇",
            has_factual_claims=False,
            claims_status="UNVERIFIED_CLAIMS"
        ),
        ProposedEventItem(
            temp_id="p3",
            channel="email",
            scheduled_at=(fallback_now + timedelta(days=6, hours=9)).isoformat(),
            display_time=f"{(fallback_now + timedelta(days=6)).strftime('%b %d, %Y')} 02:30 PM {timezone_str}",
            title="Weekly Strategy Briefing",
            draft_hook="Eliminating workflow bottlenecks for growing companies.",
            cta="Explore our founder guide",
            has_factual_claims=False,
            claims_status="UNVERIFIED_CLAIMS"
        )
    ]

    try:
        raw_res = await orchestrator.execute_step(
            step_name="AI Schedule Proposal Generation",
            system_prompt=system_prompt,
            user_input=f"USER SCHEDULE REQUEST: {req.prompt}",
            context={"brand_memory": brand_memory}
        )
        from app.utils.json_helper import extract_and_parse_json
        parsed = extract_and_parse_json(raw_res)
        
        if isinstance(parsed, dict) and "proposed_events" in parsed:
            events_out = []
            for idx, pe in enumerate(parsed.get("proposed_events", [])):
                days_offset = int(pe.get("days_from_now", idx + 1))
                h = int(pe.get("time_hour_24", 9))
                m = int(pe.get("time_minute", 30))
                target_dt = fallback_now + timedelta(days=days_offset)
                target_dt = target_dt.replace(hour=h, minute=m, second=0)
                
                events_out.append(ProposedEventItem(
                    temp_id=pe.get("temp_id") or f"p{idx+1}",
                    channel=pe.get("channel", "linkedin").lower(),
                    scheduled_at=target_dt.isoformat(),
                    display_time=f"{target_dt.strftime('%b %d, %Y %I:%M %p')} {timezone_str}",
                    title=pe.get("title") or f"{brand_name} Post {idx+1}",
                    draft_hook=pe.get("draft_hook") or "Strategic update.",
                    cta=pe.get("cta") or "Learn more",
                    has_factual_claims=bool(pe.get("has_factual_claims", False)),
                    claims_status="UNVERIFIED_CLAIMS"
                ))
                
            return AIScheduleProposalResponse(
                proposal_id=proposal_id,
                summary=parsed.get("summary", "AI Generated Schedule Proposal"),
                timezone=timezone_str,
                assumptions=parsed.get("assumptions", [f"Default posting time set to 09:30 AM {timezone_str}"]),
                ambiguities=parsed.get("ambiguities", []),
                proposed_events=events_out
            )
    except Exception as e:
        logger.warning(f"AI proposal fallback engaged: {e}")
        
    return AIScheduleProposalResponse(
        proposal_id=proposal_id,
        summary=f"Automated schedule proposal for {req.prompt[:60]}",
        timezone=timezone_str,
        assumptions=[
            f"Cadence interpreted as 3 posts over the upcoming week",
            f"Slots assigned to morning windows in {timezone_str}"
        ],
        ambiguities=[],
        proposed_events=fallback_events
    )

# ---------------------------------------------------------------------------
# Background Scheduler Polling Trigger (For testing / cron invocation)
# ---------------------------------------------------------------------------

@router.post("/worker/run-cycle")
async def run_worker_cycle(worker_id: Optional[str] = Query(None)):
    """Executes a single pass of the background scheduler worker."""
    results = await process_due_calendar_events(worker_id=worker_id)
    return {
        "status": "cycle_completed",
        "processed_count": len(results),
        "dispatches": results
    }
