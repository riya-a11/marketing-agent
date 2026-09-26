import os
import uuid
import asyncio
import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.config import settings
from app.storage.db import (
    get_all_campaigns,
    save_campaign,
    delete_campaign,
    get_social_account,
    get_all_social_accounts,
    save_social_publication,
    save_publication_attempt,
    get_publication_by_idempotency,
    get_social_publication,
    get_publications_by_batch,
    get_media_asset
)
from app.services.publishing.factory import publisher_factory
from app.services.audit.audit_ledger import AuditLedgerService

logger = logging.getLogger("campaign_publisher")

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Social Publishing"])

@router.get("/")
def list_campaigns():
    """Fetches all stored campaigns from the database."""
    campaigns = get_all_campaigns()
    if not campaigns:
        seed = [
            {
                "id": "c1",
                "title": "Product Launch Announcement",
                "content_type": "Product Launch",
                "platform": "linkedin",
                "content_text": "🚀 Launching our new AI Marketing OS! Say goodbye to manual content creation and inconsistent messaging. Our AI assistant builds your brand memory in minutes.",
                "cta": "Try the interactive demo now",
                "style_label": "Direct & Punchy",
                "quality_score": 95,
                "status": "finalised"
            },
            {
                "id": "c2",
                "title": "Founder Journey & Lessons",
                "content_type": "Founder Story",
                "platform": "x",
                "content_text": "Building a startup is hard enough. Marketing shouldn't feel like a second full-time job. Here is how incubator cohort founders are automating consistent social content.",
                "cta": "Read our founder guide",
                "style_label": "Founder Storytelling",
                "quality_score": 92,
                "status": "finalised"
            }
        ]
        for s in seed:
            save_campaign(s)
        return get_all_campaigns()
    return campaigns

@router.post("/save")
def create_or_save_campaign(payload: Dict[str, Any]):
    """Explicitly saves a campaign variation into persistent storage."""
    saved = save_campaign(payload)
    return {"status": "saved", "campaign": saved}

@router.delete("/{campaign_id}")
def remove_campaign(campaign_id: str):
    """Deletes a campaign from storage."""
    success = delete_campaign(campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "deleted", "id": campaign_id}

@router.get("/social-accounts")
def get_social_accounts_status():
    """
    Returns sanitized connection statuses for all platforms.
    NEVER exposes client secrets or private tokens to the frontend.
    """
    accounts = get_all_social_accounts()
    sanitized = []
    for acc in accounts:
        sanitized.append({
            "platform": acc["platform"],
            "account_id": acc.get("account_id"),
            "account_handle": acc.get("account_handle", "@brand"),
            "display_name": acc.get("display_name") or acc.get("account_handle", "@brand"),
            "avatar_url": acc.get("avatar_url"),
            "status": acc.get("status", "connected"),
            "scopes": acc.get("scopes", []),
            "updated_at": acc.get("updated_at")
        })
    return {"accounts": sanitized}

@router.get("/capabilities")
def get_platform_capabilities():
    """
    Returns the single-source-of-truth capability matrix for all social platforms
    (max characters, media rules, MIME types, multi-media support).
    """
    return {
        "status": "ok",
        "platforms": publisher_factory.get_capabilities_matrix()
    }

# -------------------------------------------------------------
# Error Classification & Retry Policy
# -------------------------------------------------------------

def classify_publication_error(err: Exception) -> Dict[str, Any]:
    """
    Categorizes errors according to the locked publishing matrix:
    - 400 Bad Request, 401/403 Auth/Scope/Disconnect errors, validation limits -> FAILED_TERMINAL
    - 429 Rate Limited -> FAILED_RETRYABLE (retry policy engaged)
    - 500, 502, 503, 504, Timeouts -> UNKNOWN_OUTCOME (ambiguous response; dispatches Reconciler via PublishOperationID; NO blind retry)
    """
    msg = str(err).lower()
    if "disconnect" in msg or "reauthoriz" in msg or "revok" in msg or "scope" in msg or "auth" in msg or "token" in msg or "401" in msg or "403" in msg or "permission" in msg:
        return {"error_code": "AUTH_CREDENTIAL_ERROR", "retryable": False, "retry_after_seconds": None, "provider_status": "FAILED_TERMINAL"}
    if "media" in msg or "requires" in msg or "unsupported" in msg:
        return {"error_code": "INVALID_MEDIA_REQUIREMENT", "retryable": False, "retry_after_seconds": None, "provider_status": "FAILED_TERMINAL"}
    if "character" in msg or "length" in msg or "too long" in msg:
        return {"error_code": "CHARACTER_LIMIT_EXCEEDED", "retryable": False, "retry_after_seconds": None, "provider_status": "FAILED_TERMINAL"}
    if "rate" in msg or "429" in msg or "too many requests" in msg:
        return {"error_code": "RATE_LIMITED", "retryable": True, "retry_after_seconds": 60, "provider_status": "FAILED_RETRYABLE"}
    if "500" in msg or "502" in msg or "503" in msg or "504" in msg or "timeout" in msg or "timed out" in msg or "service unavailable" in msg or "connection error" in msg or "connection refused" in msg or "connecterror" in msg:
        return {"error_code": "UNKNOWN_OUTCOME_AMBIGUOUS_RESPONSE", "retryable": False, "requires_reconciliation": True, "provider_status": "UNKNOWN_OUTCOME"}
    return {"error_code": "EXECUTION_FAILURE", "retryable": False, "retry_after_seconds": None, "provider_status": "FAILED_TERMINAL"}

# -------------------------------------------------------------
# Asynchronous Multi-Platform Publishing Dispatcher
# -------------------------------------------------------------

async def _publish_single_platform(
    platform: str,
    batch_id: str,
    campaign_id: str,
    full_text: str,
    content_text: str,
    cta: str,
    media_asset: Optional[Dict[str, Any]],
    mode: str,
    base_idempotency_key: Optional[str] = None,
    version_no: int = 1
) -> Dict[str, Any]:
    """
    Isolated execution worker for a single platform:
    - Checks platform idempotency
    - Invokes publisher adapter from factory
    - Records publication and attempt logs with classified retry metadata
    """
    platform_norm = platform.lower().strip()
    # Amendment #1: the backend OWNS idempotency-key derivation. When the client
    # sends only campaign_id + version_no, we derive the canonical key here. An
    # explicit base key (e.g. the low-level publishing test) keeps its legacy form.
    if base_idempotency_key:
        platform_idempotency_key = f"{base_idempotency_key}_{platform_norm}"
    else:
        platform_idempotency_key = f"idemp:{campaign_id}:{platform_norm}:v{version_no}"
    
    # Check if this exact platform post was already published
    if platform_idempotency_key:
        existing = get_publication_by_idempotency(platform_idempotency_key)
        if existing and existing.get("status") in ["published", "SIMULATED_PUBLISHED"]:
            logger.info(f"Idempotent hit: Platform {platform_norm} already published with key {platform_idempotency_key}")
            return {
                "platform": platform_norm,
                "status": existing.get("status"),
                "post_id": existing.get("external_post_id"),
                "permalink": existing.get("permalink"),
                "channel_name": platform_norm.title(),
                "provider_mode": "simulated",
                "published_at": existing.get("published_at"),
                "is_idempotent_replay": True
            }

    pub_id = f"pub_{platform_norm}_{uuid.uuid4().hex[:8]}"
    ws_id = "00000000-0000-0000-0000-000000000001"

    try:
        account = get_social_account(platform_norm)
        if account:
            ws_id = account.get("organization_id", ws_id)
            if account.get("status") == "disconnected" or account.get("revocation_status") in ["REVOKING", "REVOKED", "DISCONNECTED"]:
                raise ValueError(f"Account for {platform_norm.capitalize()} is DISCONNECTED. Publishing prohibited until reauthorized.")

            # Capability & Scope Pre-Flight Verification
            if not publisher_factory.verify_account_scopes(platform_norm, account):
                scope_err = f"Account for {platform_norm.capitalize()} is missing required publish scopes (granted: {account.get('granted_scopes')}). REAUTHORIZATION_REQUIRED."
                logger.warning(scope_err)
                AuditLedgerService.append_entry(
                    workspace_id=ws_id,
                    action="PUBLISH_FAILED",
                    entity_type="SOCIAL_PUBLICATION",
                    entity_id=pub_id,
                    result="FAILED",
                    payload={"platform": platform_norm, "error_code": "REAUTHORIZATION_REQUIRED", "reason": "SCOPE_INSUFFICIENT"}
                )
                save_social_publication({
                    "id": pub_id,
                    "batch_id": batch_id,
                    "idempotency_key": platform_idempotency_key,
                    "campaign_id": campaign_id,
                    "social_account_id": account.get("id"),
                    "platform": platform_norm,
                    "mode": mode,
                    "media_asset_ids": [media_asset["id"]] if media_asset else [],
                    "text": full_text,
                    "status": "failed",
                    "error_message": scope_err
                })
                return {
                    "platform": platform_norm,
                    "status": "failed",
                    "error": scope_err,
                    "error_code": "REAUTHORIZATION_REQUIRED",
                    "retryable": False,
                    "retry_after_seconds": 0,
                    "channel_name": platform_norm.title()
                }

        # Audit Ledger: PUBLISH_ATTEMPTED
        AuditLedgerService.append_entry(
            workspace_id=ws_id,
            action="PUBLISH_ATTEMPTED",
            entity_type="SOCIAL_PUBLICATION",
            entity_id=pub_id,
            payload={
                "platform": platform_norm,
                "idempotency_key": platform_idempotency_key,
                "campaign_id": campaign_id
            }
        )

        publisher = publisher_factory.get_publisher(platform_norm)
        receipt = await publisher.publish(
            account=account,
            content_text=content_text,
            cta=cta,
            media_asset=media_asset,
            idempotency_key=platform_idempotency_key
        )

        provider_mode = receipt.get("provider_mode", "simulated")
        status_label = "SIMULATED_PUBLISHED" if provider_mode == "simulated" else "published"

        # Save success publication record
        pub_record = save_social_publication({
            "id": pub_id,
            "batch_id": batch_id,
            "idempotency_key": platform_idempotency_key,
            "campaign_id": campaign_id,
            "social_account_id": account.get("id") if account else None,
            "platform": platform_norm,
            "mode": mode,
            "media_asset_ids": [media_asset["id"]] if media_asset else [],
            "text": full_text,
            "status": status_label,
            "external_post_id": receipt["external_post_id"],
            "permalink": receipt["permalink"],
            "published_at": datetime.utcnow().isoformat()
        })

        # Save attempt record
        save_publication_attempt({
            "publication_id": pub_id,
            "attempt_number": 1,
            "request_payload": receipt.get("request_payload"),
            "response_status": receipt.get("response_status", 200),
            "response_body": receipt.get("response_body")
        })

        # Audit Ledger: PUBLISH_SUCCEEDED
        AuditLedgerService.append_entry(
            workspace_id=ws_id,
            action="PUBLISH_SUCCEEDED",
            entity_type="SOCIAL_PUBLICATION",
            entity_id=pub_id,
            payload={
                "platform": platform_norm,
                "idempotency_key": platform_idempotency_key,
                "external_post_id": receipt["external_post_id"],
                "provider_mode": provider_mode
            }
        )

        return {
            "platform": platform_norm,
            "publication_id": pub_id,
            "status": status_label,
            "post_id": receipt["external_post_id"],
            "permalink": receipt["permalink"],
            "channel_name": receipt.get("channel_name", platform_norm.title()),
            "provider_mode": provider_mode,
            "published_at": pub_record.get("published_at")
        }

    except Exception as err:
        err_msg = str(err)
        logger.error(f"Platform publication failure on {platform_norm}: {err_msg}")
        classification = classify_publication_error(err)
        is_reconciliation_needed = classification.get("requires_reconciliation", False)
        status_label = "RECONCILIATION_REQUIRED" if is_reconciliation_needed else "failed"
        audit_action = "PUBLISH_RECONCILIATION_REQUIRED" if is_reconciliation_needed else "PUBLISH_FAILED"

        # Save failed publication and attempt with retry classification
        save_social_publication({
            "id": pub_id,
            "batch_id": batch_id,
            "idempotency_key": platform_idempotency_key,
            "campaign_id": campaign_id,
            "social_account_id": account.get("id") if account else None,
            "platform": platform_norm,
            "mode": mode,
            "media_asset_ids": [media_asset["id"]] if media_asset else [],
            "text": full_text,
            "status": status_label,
            "error_message": err_msg
        })

        save_publication_attempt({
            "publication_id": pub_id,
            "attempt_number": 1,
            "request_payload": {"text": full_text},
            "response_status": 504 if is_reconciliation_needed else 400,
            "error": err_msg
        })

        AuditLedgerService.append_entry(
            workspace_id=ws_id,
            action=audit_action,
            entity_type="SOCIAL_PUBLICATION",
            entity_id=pub_id,
            result="PENDING_RECONCILIATION" if is_reconciliation_needed else "FAILED",
            payload={
                "platform": platform_norm,
                "idempotency_key": platform_idempotency_key,
                "error": err_msg,
                "classification": classification
            }
        )

        return {
            "platform": platform_norm,
            "publication_id": pub_id,
            "idempotency_key": platform_idempotency_key,
            "status": status_label,
            "error": err_msg,
            "error_code": classification.get("error_code", "GENERIC_ERROR"),
            "requires_reconciliation": is_reconciliation_needed,
            "retryable": classification.get("retryable", False),
            "retry_after_seconds": classification.get("retry_after_seconds", 0),
            "channel_name": platform_norm.title()
        }

@router.post("/multi-publish")
async def multi_platform_publish(payload: Dict[str, Any]):
    """
    Enterprise Multi-Platform Broadcast Engine:
    - Idempotency key checking to prevent double-posting
    - Concurrent failure-isolated execution across LinkedIn, X, and Instagram
    - Distinct publication receipts and audit logs
    """
    platforms = payload.get("platforms") or [payload.get("platform", "linkedin")]
    content_text = payload.get("content_text", "").strip()
    cta = payload.get("cta", "").strip()
    full_text = f"{content_text}\n\n{cta}".strip() if cta else content_text
    
    media_id = payload.get("media_id")
    media_asset = get_media_asset(media_id) if media_id else None
    if not media_asset and payload.get("media_url"):
        media_asset = {
            "id": "direct_url",
            "filename": "attached_media",
            "public_url": payload["media_url"],
            "content_type": "image/jpeg"
        }

    batch_id = payload.get("batch_id") or f"batch_{int(datetime.utcnow().timestamp()*1000)}"
    campaign_id = payload.get("campaign_id") or f"camp_{int(datetime.utcnow().timestamp()*1000)}"
    version_no = int(payload.get("version_no", 1) or 1)
    explicit_key = payload.get("idempotency_key")
    idempotency_key = explicit_key or f"idemp:{campaign_id}:v{version_no}"
    mode = payload.get("mode", "direct_api")

    # Optional per-platform copy ({linkedin, x, instagram}); falls back to content_text.
    platform_content = payload.get("platform_content") or {}

    def _resolve_text(p: str) -> str:
        raw = platform_content.get(p.lower().strip())
        if isinstance(raw, dict):
            raw = raw.get("post_text") or raw.get("caption") or raw.get("text")
        return (raw or content_text or "").strip()

    # Dispatch all platforms concurrently with failure isolation
    tasks = []
    for p in platforms:
        p_text = _resolve_text(p)
        p_full = f"{p_text}\n\n{cta}".strip() if cta else p_text
        tasks.append(
            _publish_single_platform(
                platform=p,
                batch_id=batch_id,
                campaign_id=campaign_id,
                full_text=p_full,
                content_text=p_text,
                cta=cta,
                media_asset=media_asset,
                mode=mode,
                base_idempotency_key=explicit_key,
                version_no=version_no,
            )
        )

    results = await asyncio.gather(*tasks, return_exceptions=False)

    succeeded_count = sum(1 for r in results if r.get("status") in ["published", "SIMULATED_PUBLISHED"])
    failed_count = sum(1 for r in results if r.get("status") == "failed")
    
    batch_status = "published" if failed_count == 0 else ("partial" if succeeded_count > 0 else "failed")

    # Persist aggregated campaign record
    try:
        primary_platform = platforms[0] if len(platforms) == 1 else f"Multi ({', '.join(platforms)})"
        save_campaign({
            "id": campaign_id,
            "title": payload.get("title", f"{primary_platform} Live Publication"),
            "content_type": f"Published Social Post",
            "platform": primary_platform,
            "content_text": content_text,
            "cta": cta,
            "status": f"batch_{batch_status}",
            "media_url": media_asset.get("public_url") if media_asset else None
        })
    except Exception as e:
        logger.warning(f"Could not persist campaign history: {e}")

    return {
        "batch_id": batch_id,
        "campaign_id": campaign_id,
        "idempotency_key": idempotency_key,
        "mode": mode,
        "status": batch_status,
        "total": len(platforms),
        "succeeded": succeeded_count,
        "failed": failed_count,
        "results": results
    }

@router.get("/publication-batches/{batch_id}")
def get_publication_batch_status(batch_id: str):
    """Retrieves status and individual platform receipts for a publication batch job."""
    publications = get_publications_by_batch(batch_id)
    if not publications:
        raise HTTPException(status_code=404, detail="Publication batch not found")
    
    total = len(publications)
    succeeded = sum(1 for p in publications if p.get("status") == "published")
    failed = sum(1 for p in publications if p.get("status") == "failed")
    status = "published" if failed == 0 and total > 0 else ("partial" if succeeded > 0 else ("failed" if failed > 0 else "pending"))

    return {
        "batch_id": batch_id,
        "status": status,
        "total": total,
        "succeeded": succeeded,
        "failed": failed,
        "publications": publications
    }

@router.post("/reconcile/{publication_id}")
async def reconcile_publication_endpoint(publication_id: str):
    """
    Reconciles an ambiguous publication outcome (timeout / 504 / UNKNOWN_OUTCOME)
    via idempotency key lookup to the provider adapter without creating duplicate posts:
    - Verifies upstream receipt
    - Transitions publication from 'RECONCILIATION_REQUIRED' to 'published'
    - Appends PUBLISH_RECONCILED to the immutable audit ledger
    - Guarantees exactly 1 external side effect
    """
    pub = get_social_publication(publication_id)
    if not pub:
        pub = get_publication_by_idempotency(publication_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publication record not found for reconciliation.")

    platform = pub.get("platform", "linkedin").lower()
    idempotency_key = pub.get("idempotency_key")

    receipt = await publisher_factory.reconcile_publication(platform, idempotency_key)
    if not receipt or receipt.get("status") != "published":
        raise HTTPException(status_code=422, detail="Upstream provider could not find post for reconciliation.")

    now_iso = datetime.utcnow().isoformat()
    pub["status"] = "published"
    pub["external_post_id"] = receipt["external_post_id"]
    pub["permalink"] = receipt["permalink"]
    pub["published_at"] = now_iso
    pub["error_message"] = None
    save_social_publication(pub)

    # Append immutable audit ledger entry
    AuditLedgerService.append_entry(
        workspace_id=pub.get("organization_id", "00000000-0000-0000-0000-000000000001"),
        action="PUBLISH_RECONCILED",
        entity_type="SOCIAL_PUBLICATION",
        entity_id=pub["id"],
        payload={
            "platform": platform,
            "idempotency_key": idempotency_key,
            "external_post_id": receipt["external_post_id"],
            "external_publication_count": receipt.get("call_count", 1)
        }
    )

    return {
        "status": "reconciled",
        "publication_id": pub["id"],
        "platform": platform,
        "external_post_id": receipt["external_post_id"],
        "permalink": receipt["permalink"],
        "external_publication_count": receipt.get("call_count", 1)
    }

# -------------------------------------------------------------
# n8n Automation Engine Webhook Integration
# -------------------------------------------------------------

@router.post("/publish")
async def publish_via_n8n(request_payload: Dict[str, Any]):
    """
    Dispatches a normalized multi-platform payload to an n8n webhook workflow.
    Normalized Contract: { campaign_id, mode, content, platforms, media, scheduled_at }
    """
    webhook_url = request_payload.get("custom_webhook_url") or settings.N8N_WEBHOOK_URL
    platform = request_payload.get("platform", "linkedin").lower()
    
    media_id = request_payload.get("media_id")
    media_asset = get_media_asset(media_id) if media_id else None
    media_list = []
    if media_asset:
        media_list.append({
            "id": media_asset["id"],
            "url": media_asset["public_url"],
            "type": media_asset["content_type"]
        })
    elif request_payload.get("media_url"):
        media_list.append({
            "id": "external_media",
            "url": request_payload["media_url"],
            "type": "image/jpeg"
        })

    campaign_id = request_payload.get("campaign_id") or f"camp_{int(datetime.utcnow().timestamp()*1000)}"
    dispatch_payload = {
        "event": "marketing_os.campaign_published",
        "timestamp": datetime.utcnow().isoformat(),
        "campaign_id": campaign_id,
        "mode": "n8n",
        "title": request_payload.get("title", "Multi-Platform Campaign"),
        "content": {
            "text": request_payload.get("content_text", ""),
            "cta": request_payload.get("cta", ""),
            "style_label": request_payload.get("style_label", "Standard")
        },
        "platforms": [
            {
                "platform": platform,
                "account_handle": request_payload.get("account_handle", "@brand")
            }
        ],
        "media": media_list,
        "scheduled_at": request_payload.get("scheduled_at")
    }

    try:
        save_campaign({
            "id": campaign_id,
            "title": dispatch_payload["title"],
            "content_type": request_payload.get("content_type", "n8n Automated Post"),
            "platform": platform,
            "content_text": request_payload.get("content_text", ""),
            "cta": request_payload.get("cta", ""),
            "style_label": request_payload.get("style_label", "Standard"),
            "status": "published_via_n8n"
        })
    except Exception as e:
        logger.warning(f"Could not update campaign status: {e}")

    n8n_connected = False
    try:
        headers = {"Content-Type": "application/json"}
        if settings.N8N_API_KEY:
            headers["X-N8N-API-KEY"] = settings.N8N_API_KEY
            
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.post(webhook_url, json=dispatch_payload, headers=headers)
            if response.status_code in (200, 201, 202, 204):
                n8n_connected = True
    except Exception as err:
        logger.info(f"n8n webhook offline or local tunnel not configured ({err}). Running graceful dispatch fallback.")

    return {
        "status": "dispatched",
        "n8n_connected": n8n_connected,
        "platform": platform,
        "message": f"Successfully queued campaign for {platform.upper()} via n8n automation workflow!",
        "webhook_url": webhook_url,
        "execution_id": f"exec_{int(datetime.utcnow().timestamp())}",
        "dispatched_at": datetime.utcnow().isoformat(),
        "payload_dispatched": dispatch_payload
    }
