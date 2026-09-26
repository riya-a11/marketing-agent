import sqlite3
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("storage_db")

DB_PATH = Path(__file__).parent.parent.parent / "marketing_os.db"

def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite database tables for brand profiles, campaigns, and video storyboards."""
    conn = get_connection()
    cursor = conn.cursor()

    # Multi-Tenant Organizations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Organization Members
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organization_members (
        organization_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'owner',
        PRIMARY KEY (organization_id, user_id)
    );
    """)

    # Brand Profiles (Scoped to organization)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS brand_profiles (
        id TEXT PRIMARY KEY,
        organization_id TEXT DEFAULT 'org_velo',
        brand_name TEXT NOT NULL,
        industry TEXT,
        brand_voice TEXT,
        tone TEXT,
        brand_memory TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Campaigns / Generated Content
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        organization_id TEXT DEFAULT 'org_velo',
        brand_profile_id TEXT,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL,
        platform TEXT NOT NULL,
        content_text TEXT NOT NULL,
        cta TEXT,
        style_label TEXT,
        quality_score INTEGER DEFAULT 90,
        review_breakdown TEXT,
        status TEXT DEFAULT 'generated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Video Storyboards
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS video_storyboards (
        id TEXT PRIMARY KEY,
        campaign_id TEXT,
        video_title TEXT NOT NULL,
        aspect_ratio TEXT DEFAULT '9:16',
        scenes TEXT NOT NULL,
        voiceover_script TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Media Assets Subsystem
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        organization_id TEXT DEFAULT 'org_velo',
        filename TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        public_url TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        duration REAL,
        status TEXT DEFAULT 'ready',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Connected Social Accounts (Multi-Tenant Scoped)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS social_accounts (
        id TEXT PRIMARY KEY,
        organization_id TEXT DEFAULT 'org_velo',
        connected_by_user_id TEXT,
        platform TEXT NOT NULL,
        account_id TEXT,
        account_handle TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_expires_at TEXT,
        scopes TEXT,
        status TEXT DEFAULT 'connected',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Social Publications (Publishing Receipts & Status)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS social_publications (
        id TEXT PRIMARY KEY,
        organization_id TEXT DEFAULT 'org_velo',
        batch_id TEXT,
        idempotency_key TEXT,
        campaign_id TEXT,
        social_account_id TEXT,
        platform TEXT NOT NULL,
        mode TEXT DEFAULT 'direct_api',
        media_asset_ids TEXT,
        text TEXT NOT NULL,
        status TEXT NOT NULL,
        external_post_id TEXT,
        permalink TEXT,
        error_message TEXT,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Publication Execution & Attempt Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS publication_attempts (
        id TEXT PRIMARY KEY,
        publication_id TEXT NOT NULL,
        attempt_number INTEGER DEFAULT 1,
        request_payload TEXT,
        response_status INTEGER,
        response_body TEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Marketing Calendar Events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        brand_id TEXT NOT NULL,
        campaign_id TEXT,
        title TEXT NOT NULL,
        channel TEXT NOT NULL,
        scheduled_at TIMESTAMP NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
        content_version INTEGER NOT NULL DEFAULT 1,
        current_content_hash TEXT NOT NULL,
        approved_version INTEGER,
        approved_content_hash TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        lock_acquired_at TIMESTAMP,
        lock_worker_id TEXT,
        created_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Channel Content Payloads
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS event_contents (
        event_id TEXT PRIMARY KEY,
        channel_payload TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES calendar_events (id) ON DELETE CASCADE
    );
    """)

    # Immutable Human Verification Audit Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verification_audit_logs (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_role TEXT NOT NULL,
        action TEXT NOT NULL,
        content_version INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        snapshot_payload TEXT NOT NULL,
        scheduled_at_snapshot TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Durable Multi-Instance OAuth State Engine (CSRF & PKCE with Atomic Single-Use Consumption)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        code_verifier TEXT,
        redirect_uri TEXT NOT NULL,
        session_binding_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Immutable Audit Ledger Entries (Authoritative Append-Only Event Stream)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_ledger_entries (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_version INTEGER DEFAULT 1,
        result TEXT NOT NULL DEFAULT 'SUCCESS',
        request_id TEXT,
        job_id TEXT,
        payload TEXT NOT NULL,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Composite Scheduler & Query Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_calendar_worker_claim ON calendar_events (status, scheduled_at, lock_acquired_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_calendar_tenant_brand ON calendar_events (org_id, brand_id, status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_calendar_scheduled_range ON calendar_events (org_id, brand_id, scheduled_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_verification_event_id ON verification_audit_logs (event_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_oauth_states_lookup ON oauth_states (state, status, expires_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_ledger_workspace ON audit_ledger_entries (workspace_id, action, created_at);")

    # Column Migrations (ensures backward compatibility)
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN organization_id TEXT DEFAULT 'org_velo';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN connected_by_user_id TEXT;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_publications ADD COLUMN organization_id TEXT DEFAULT 'org_velo';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE media_assets ADD COLUMN organization_id TEXT DEFAULT 'org_velo';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE verification_audit_logs ADD COLUMN request_id TEXT;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE verification_audit_logs ADD COLUMN job_id TEXT;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE verification_audit_logs ADD COLUMN result TEXT DEFAULT 'SUCCESS';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN credential_version INTEGER DEFAULT 1;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN key_version TEXT DEFAULT 'v2';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN provider_mode TEXT DEFAULT 'live';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN revocation_status TEXT DEFAULT 'ACTIVE';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN granted_scopes TEXT;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN scope_version TEXT DEFAULT 'v1';")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN refresh_claimed_by TEXT;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN refresh_generation INTEGER DEFAULT 0;")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE social_accounts ADD COLUMN refresh_lease_expires_at TIMESTAMP;")
    except Exception:
        pass

    # Seed Default Organizations for Multi-Tenant Demo
    cursor.execute("""
    INSERT INTO organizations (id, name, slug)
    VALUES ('org_velo', 'Velo Dynamics', 'velo-dynamics'),
           ('org_creditlense', 'CreditLense', 'creditlense')
    ON CONFLICT(id) DO NOTHING;
    """)

    cursor.execute("""
    INSERT INTO users (id, email, name)
    VALUES ('user_founder_1', 'founder@velodynamics.com', 'Riya (Founder)')
    ON CONFLICT(id) DO NOTHING;
    """)

    cursor.execute("""
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES ('org_velo', 'user_founder_1', 'owner')
    ON CONFLICT(organization_id, user_id) DO NOTHING;
    """)

    conn.commit()
    conn.close()
    # Brand Profile CRUD
def save_brand_profile(profile_data: Dict[str, Any], profile_id: str = "default-profile") -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    brand_name = profile_data.get("brand_name", "My Startup")
    industry = profile_data.get("industry", "Tech")
    brand_voice = profile_data.get("brand_voice", "Professional")
    tone = profile_data.get("tone", "Confident")
    memory_json = json.dumps(profile_data)
    now = datetime.utcnow().isoformat()

    cursor.execute("""
    INSERT INTO brand_profiles (id, brand_name, industry, brand_voice, tone, brand_memory, is_active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET
        brand_name=excluded.brand_name,
        industry=excluded.industry,
        brand_voice=excluded.brand_voice,
        tone=excluded.tone,
        brand_memory=excluded.brand_memory,
        updated_at=excluded.updated_at
    """, (profile_id, brand_name, industry, brand_voice, tone, memory_json, now))

    conn.commit()
    conn.close()
    return profile_data

def get_active_brand_profile(profile_id: str = "default-profile") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT brand_memory FROM brand_profiles WHERE id = ? OR is_active = 1 ORDER BY updated_at DESC LIMIT 1", (profile_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row and row["brand_memory"]:
        try:
            return json.loads(row["brand_memory"])
        except Exception:
            pass
    return None

# Campaigns CRUD
def save_campaign(campaign_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    cid = campaign_data.get("id") or f"camp_{int(datetime.utcnow().timestamp()*1000)}"
    brand_profile_id = campaign_data.get("brand_profile_id", "default-profile")
    title = campaign_data.get("title") or f"{campaign_data.get('content_type', 'Post')} - {campaign_data.get('platform', 'Social')}"
    content_type = campaign_data.get("content_type", "General Post")
    platform = campaign_data.get("platform", "linkedin")
    content_text = campaign_data.get("content_text", "")
    cta = campaign_data.get("cta", "")
    style_label = campaign_data.get("style_label", "Standard")
    quality_score = int(campaign_data.get("quality_score", 90))
    review_breakdown = json.dumps(campaign_data.get("review_breakdown") or {})
    status = campaign_data.get("status", "finalised")

    cursor.execute("""
    INSERT INTO campaigns (id, brand_profile_id, title, content_type, platform, content_text, cta, style_label, quality_score, review_breakdown, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        content_text=excluded.content_text,
        cta=excluded.cta,
        status=excluded.status
    """, (cid, brand_profile_id, title, content_type, platform, content_text, cta, style_label, quality_score, review_breakdown, status))

    conn.commit()
    conn.close()
    
    campaign_data["id"] = cid
    return campaign_data

def get_all_campaigns() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM campaigns ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "content_type": r["content_type"],
            "type": r["content_type"],
            "platform": r["platform"],
            "content_text": r["content_text"],
            "text": r["content_text"],
            "cta": r["cta"],
            "style_label": r["style_label"],
            "quality_score": r["quality_score"],
            "date": r["created_at"][:10] if r["created_at"] else datetime.utcnow().strftime("%Y-%m-%d"),
            "status": r["status"]
        })
    return results

def delete_campaign(campaign_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

# Media Assets CRUD
def save_media_asset(asset: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    aid = asset.get("id") or f"media_{int(datetime.utcnow().timestamp()*1000)}"
    now = datetime.utcnow().isoformat()

    cursor.execute("""
    INSERT INTO media_assets (id, filename, storage_path, public_url, content_type, size, width, height, duration, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        public_url=excluded.public_url,
        size=excluded.size
    """, (
        aid,
        asset.get("filename", "unknown"),
        asset.get("storage_path", ""),
        asset.get("public_url", ""),
        asset.get("content_type", "application/octet-stream"),
        int(asset.get("size", 0)),
        asset.get("width"),
        asset.get("height"),
        asset.get("duration"),
        now
    ))
    conn.commit()
    conn.close()
    asset["id"] = aid
    asset["created_at"] = now
    return asset

def get_media_asset(asset_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM media_assets WHERE id = ?", (asset_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def list_media_assets(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM media_assets ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Social Accounts CRUD
def save_social_account(account: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    aid = account.get("id") or f"acc_{account['platform']}_{int(datetime.utcnow().timestamp())}"
    now = datetime.utcnow().isoformat()
    scopes_str = json.dumps(account.get("scopes") or []) if isinstance(account.get("scopes"), (list, dict)) else str(account.get("scopes") or "[]")
    granted_scopes_str = json.dumps(account.get("granted_scopes") or account.get("scopes") or []) if isinstance(account.get("granted_scopes") or account.get("scopes"), (list, dict)) else str(account.get("granted_scopes") or account.get("scopes") or "[]")
    
    cred_ver = account.get("credential_version", 1)
    key_ver = account.get("key_version", "v2")
    provider_mode = account.get("provider_mode", "live")
    revocation_status = account.get("revocation_status", "ACTIVE")
    scope_ver = account.get("scope_version", "v1")
    org_id = account.get("organization_id", "00000000-0000-0000-0000-000000000001")
    connected_user = account.get("connected_by_user_id", "usr_admin_001")

    cursor.execute("""
    INSERT INTO social_accounts (
        id, organization_id, connected_by_user_id, platform, account_id, account_handle,
        display_name, avatar_url, access_token_encrypted, refresh_token_encrypted,
        token_expires_at, scopes, granted_scopes, scope_version, credential_version,
        key_version, provider_mode, revocation_status, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(platform) DO UPDATE SET
        organization_id=coalesce(excluded.organization_id, social_accounts.organization_id),
        connected_by_user_id=coalesce(excluded.connected_by_user_id, social_accounts.connected_by_user_id),
        account_id=excluded.account_id,
        account_handle=excluded.account_handle,
        display_name=excluded.display_name,
        avatar_url=excluded.avatar_url,
        access_token_encrypted=excluded.access_token_encrypted,
        refresh_token_encrypted=excluded.refresh_token_encrypted,
        token_expires_at=excluded.token_expires_at,
        scopes=excluded.scopes,
        granted_scopes=coalesce(excluded.granted_scopes, social_accounts.granted_scopes),
        scope_version=coalesce(excluded.scope_version, social_accounts.scope_version),
        credential_version=social_accounts.credential_version + 1,
        key_version=coalesce(excluded.key_version, social_accounts.key_version),
        provider_mode=coalesce(excluded.provider_mode, social_accounts.provider_mode),
        revocation_status=coalesce(excluded.revocation_status, social_accounts.revocation_status),
        status=excluded.status,
        updated_at=excluded.updated_at
    """, (
        aid,
        org_id,
        connected_user,
        account["platform"].lower(),
        account.get("account_id", ""),
        account.get("account_handle", "@brand"),
        account.get("display_name", account.get("account_handle", "@brand")),
        account.get("avatar_url", ""),
        account.get("access_token_encrypted", ""),
        account.get("refresh_token_encrypted", ""),
        account.get("token_expires_at"),
        scopes_str,
        granted_scopes_str,
        scope_ver,
        cred_ver,
        key_ver,
        provider_mode,
        revocation_status,
        account.get("status", "connected"),
        now,
        now
    ))
    conn.commit()
    conn.close()
    account["id"] = aid
    account["updated_at"] = now
    return account

# ---------------------------------------------------------------------------
# Durable OAuth State Engine (Atomic Single-Use State Machine)
# ---------------------------------------------------------------------------
def create_oauth_state(
    state: str,
    workspace_id: str,
    user_id: str,
    provider: str,
    redirect_uri: str,
    session_binding_hash: str,
    code_verifier: Optional[str] = None,
    ttl_seconds: int = 600
) -> Dict[str, Any]:
    """Persists a single-use OAuth state record bound to user, workspace, session, and provider."""
    from datetime import timedelta
    conn = get_connection()
    cursor = conn.cursor()
    now_dt = datetime.utcnow()
    expires_at = (now_dt + timedelta(seconds=ttl_seconds)).isoformat()
    
    cursor.execute("""
    INSERT INTO oauth_states (
        state, workspace_id, user_id, provider, code_verifier,
        redirect_uri, session_binding_hash, status, expires_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    """, (
        state,
        workspace_id,
        user_id,
        provider.lower(),
        code_verifier,
        redirect_uri,
        session_binding_hash,
        expires_at,
        now_dt.isoformat()
    ))
    conn.commit()
    conn.close()
    return {
        "state": state,
        "workspace_id": workspace_id,
        "user_id": user_id,
        "provider": provider.lower(),
        "expires_at": expires_at,
        "status": "PENDING"
    }

def consume_oauth_state(
    state: str,
    provider: str,
    session_binding_hash: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Atomically consumes an OAuth state using conditional UPDATE ... RETURNING.
    Guarantees that two concurrent callbacks cannot both consume the state.
    Immediately clears the secret code_verifier upon successful consumption.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()
    
    # Atomic transition from PENDING to CONSUMED with expiration & provider check
    query = """
    UPDATE oauth_states
    SET status = 'CONSUMED',
        consumed_at = ?
    WHERE state = ?
      AND provider = ?
      AND status = 'PENDING'
      AND expires_at > ?
    """
    params = [now_iso, state, provider.lower(), now_iso]
    
    if session_binding_hash:
        query += " AND session_binding_hash = ?"
        params.append(session_binding_hash)
        
    query += " RETURNING state, workspace_id, user_id, provider, code_verifier, redirect_uri, session_binding_hash, status, expires_at, consumed_at;"

    try:
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        conn.commit()
        if not row:
            conn.close()
            return None
        
        result = dict(row)
        
        # P0 Security requirement: Immediately wipe code_verifier from DB after retrieval
        cursor.execute("UPDATE oauth_states SET code_verifier = NULL WHERE state = ?", (state,))
        conn.commit()
        conn.close()
        return result
    except Exception as e:
        logger.error(f"Error consuming OAuth state {state}: {e}")
        conn.close()
        return None

# ---------------------------------------------------------------------------
# Concurrency-Controlled Token Refresh with Distributed Lease
# ---------------------------------------------------------------------------
def acquire_refresh_lease(platform: str, worker_id: str, lease_seconds: int = 30) -> Optional[Dict[str, Any]]:
    """
    Acquires a distributed refresh lease with automatic TTL expiration reclamation.
    Guarantees only one worker executes token refresh while concurrent workers wait/reload.
    """
    from datetime import timedelta
    conn = get_connection()
    cursor = conn.cursor()
    now_dt = datetime.utcnow()
    now_iso = now_dt.isoformat()
    new_expires_at = (now_dt + timedelta(seconds=lease_seconds)).isoformat()

    # Acquire lease if unleased or previous lease expired
    cursor.execute("""
    UPDATE social_accounts
    SET refresh_claimed_by = ?,
        refresh_generation = refresh_generation + 1,
        refresh_lease_expires_at = ?
    WHERE platform = ?
      AND (refresh_lease_expires_at IS NULL OR refresh_lease_expires_at < ?)
    RETURNING id, platform, credential_version, refresh_generation, refresh_claimed_by;
    """, (worker_id, new_expires_at, platform.lower(), now_iso))
    
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return dict(row) if row else None

def release_refresh_lease_and_update_tokens(
    platform: str,
    worker_id: str,
    expected_credential_version: int,
    new_access_token_enc: str,
    new_refresh_token_enc: Optional[str] = None,
    new_expires_at: Optional[str] = None
) -> bool:
    """
    Atomically updates refreshed tokens with optimistic version fencing and releases lease.
    Fails if credential_version has drifted.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()
    
    cursor.execute("""
    UPDATE social_accounts
    SET access_token_encrypted = ?,
        refresh_token_encrypted = coalesce(?, refresh_token_encrypted),
        token_expires_at = coalesce(?, token_expires_at),
        credential_version = credential_version + 1,
        refresh_claimed_by = NULL,
        refresh_lease_expires_at = NULL,
        status = 'connected',
        updated_at = ?
    WHERE platform = ?
      AND refresh_claimed_by = ?
      AND credential_version = ?;
    """, (
        new_access_token_enc,
        new_refresh_token_enc,
        new_expires_at,
        now_iso,
        platform.lower(),
        worker_id,
        expected_credential_version
    ))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return success

# ---------------------------------------------------------------------------
# Formalized Revocation State Machine (ACTIVE -> REVOKING -> REVOKED -> DISCONNECTED)
# ---------------------------------------------------------------------------
def update_social_account_revocation_status(platform: str, revocation_status: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Transitions account through intermediate revocation states:
    ACTIVE -> REVOKING -> REVOKED
    Credentials remain intact until final DISCONNECTED stage so upstream revocation can execute.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()
    cursor.execute("""
    UPDATE social_accounts
    SET revocation_status = ?,
        updated_at = ?
    WHERE platform = ?
    RETURNING id, platform, status, revocation_status, updated_at;
    """, (revocation_status, now_iso, platform.lower()))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return dict(row) if row else None

def soft_disconnect_social_account(platform: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Finalizes disconnect transition to DISCONNECTED:
    - Destroys secret tokens at rest (sets encrypted access/refresh tokens to NULL)
    - Sets revocation_status = 'DISCONNECTED' and status = 'disconnected'
    - Prevents all future publish operations
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()
    
    cursor.execute("""
    UPDATE social_accounts
    SET status = 'disconnected',
        revocation_status = 'DISCONNECTED',
        access_token_encrypted = NULL,
        refresh_token_encrypted = NULL,
        updated_at = ?
    WHERE platform = ?
    RETURNING id, platform, status, revocation_status, updated_at;
    """, (now_iso, platform.lower()))
    
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return dict(row) if row else None

def get_social_account(platform: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM social_accounts WHERE platform = ?", (platform.lower(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        res = dict(row)
        if res.get("scopes"):
            try:
                res["scopes"] = json.loads(res["scopes"])
            except Exception:
                pass
        if res.get("granted_scopes"):
            try:
                res["granted_scopes"] = json.loads(res["granted_scopes"])
            except Exception:
                pass
        return res
    return None

def get_all_social_accounts() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM social_accounts ORDER BY platform ASC")
    rows = cursor.fetchall()
    conn.close()
    
    # If no accounts exist yet, seed standard accounts
    if not rows:
        seed_accounts = [
            {
                "platform": "linkedin",
                "account_id": "urn:li:organization:9847123",
                "account_handle": "Velo Dynamics Inc.",
                "display_name": "LinkedIn Business",
                "status": "connected",
                "scopes": ["w_member_social", "w_organization_social", "r_liteprofile"]
            },
            {
                "platform": "x",
                "account_id": "1738291048",
                "account_handle": "@velo_hq",
                "display_name": "X (Twitter)",
                "status": "connected",
                "scopes": ["tweet.read", "tweet.write", "users.read", "offline.access"]
            },
            {
                "platform": "instagram",
                "account_id": "17841405829102",
                "account_handle": "@velo.dynamics",
                "display_name": "Instagram Professional",
                "status": "connected",
                "scopes": ["instagram_basic", "instagram_content_publish", "pages_show_list"]
            }
        ]
        for acc in seed_accounts:
            save_social_account(acc)
        return get_all_social_accounts()

    results = []
    for r in rows:
        acc = dict(r)
        if acc.get("scopes"):
            try:
                acc["scopes"] = json.loads(acc["scopes"])
            except Exception:
                pass
        results.append(acc)
    return results

def delete_social_account(platform: str) -> bool:
    return bool(soft_disconnect_social_account(platform, user_id="usr_admin_001"))

# Social Publications & Attempts CRUD
def save_social_publication(pub: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    pid = pub.get("id") or f"pub_{int(datetime.utcnow().timestamp()*1000)}"
    batch_id = pub.get("batch_id") or f"batch_{int(datetime.utcnow().timestamp()*1000)}"
    idempotency_key = pub.get("idempotency_key")
    media_ids_str = json.dumps(pub.get("media_asset_ids") or []) if isinstance(pub.get("media_asset_ids"), list) else str(pub.get("media_asset_ids") or "[]")
    now = datetime.utcnow().isoformat()

    cursor.execute("""
    INSERT INTO social_publications (id, batch_id, idempotency_key, campaign_id, social_account_id, platform, mode, media_asset_ids, text, status, external_post_id, permalink, error_message, published_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        batch_id=coalesce(excluded.batch_id, social_publications.batch_id),
        idempotency_key=coalesce(excluded.idempotency_key, social_publications.idempotency_key),
        status=excluded.status,
        external_post_id=excluded.external_post_id,
        permalink=excluded.permalink,
        error_message=excluded.error_message,
        published_at=excluded.published_at
    """, (
        pid,
        batch_id,
        idempotency_key,
        pub.get("campaign_id"),
        pub.get("social_account_id"),
        pub.get("platform", "general").lower(),
        pub.get("mode", "direct_api"),
        media_ids_str,
        pub.get("text", ""),
        pub.get("status", "pending"),
        pub.get("external_post_id"),
        pub.get("permalink"),
        pub.get("error_message"),
        pub.get("published_at") or (now if pub.get("status") == "published" else None),
        now
    ))
    conn.commit()
    conn.close()
    pub["id"] = pid
    pub["batch_id"] = batch_id
    return pub

def get_publication_by_idempotency(idempotency_key: str) -> Optional[Dict[str, Any]]:
    if not idempotency_key:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM social_publications WHERE idempotency_key = ?", (idempotency_key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_social_publication(pub_id: str) -> Optional[Dict[str, Any]]:
    if not pub_id:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM social_publications WHERE id = ?", (pub_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def query_audit_ledger_entries(action: Optional[str] = None, entity_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM audit_ledger_entries WHERE 1=1"
    params = []
    if action:
        query += " AND action = ?"
        params.append(action)
    if entity_id:
        query += " AND entity_id = ?"
        params.append(entity_id)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        item = dict(r)
        if item.get("payload"):
            try:
                item["payload"] = json.loads(item["payload"])
            except Exception:
                pass
        results.append(item)
    return results

def get_publications_by_batch(batch_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM social_publications WHERE batch_id = ? ORDER BY created_at ASC", (batch_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_publication_attempt(attempt: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    aid = attempt.get("id") or f"att_{int(datetime.utcnow().timestamp()*1000)}"
    payload_str = json.dumps(attempt.get("request_payload") or {}) if isinstance(attempt.get("request_payload"), dict) else str(attempt.get("request_payload") or "")
    body_str = json.dumps(attempt.get("response_body") or {}) if isinstance(attempt.get("response_body"), (dict, list)) else str(attempt.get("response_body") or "")

    cursor.execute("""
    INSERT INTO publication_attempts (id, publication_id, attempt_number, request_payload, response_status, response_body, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        aid,
        attempt.get("publication_id", ""),
        int(attempt.get("attempt_number", 1)),
        payload_str,
        attempt.get("response_status"),
        body_str,
        attempt.get("error")
    ))
    conn.commit()
    conn.close()
    attempt["id"] = aid
    return attempt

def get_publications_for_campaign(campaign_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM social_publications WHERE campaign_id = ? ORDER BY created_at DESC", (campaign_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ---------------------------------------------------------------------------
# Marketing Calendar & Verification Gate DAO
# ---------------------------------------------------------------------------

from app.utils.canonical_hasher import compute_calendar_event_hash, canonical_json
import uuid

def create_calendar_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    event_id = event_data.get("id") or str(uuid.uuid4())
    org_id = event_data.get("org_id") or "org_velo"
    brand_id = event_data.get("brand_id") or "velo"
    campaign_id = event_data.get("campaign_id")
    title = event_data.get("title", "Untitled Marketing Event")
    channel = (event_data.get("channel") or "linkedin").lower()
    scheduled_at = event_data.get("scheduled_at") or datetime.utcnow().isoformat()
    timezone = event_data.get("timezone") or "Asia/Kolkata"
    status = event_data.get("status") or "PENDING_VERIFICATION"
    content_version = int(event_data.get("content_version") or 1)
    channel_payload = event_data.get("channel_payload") or {}
    created_by = event_data.get("created_by") or "founder@velodynamics.com"
    now = datetime.utcnow().isoformat()
    
    current_content_hash = compute_calendar_event_hash(
        channel=channel,
        channel_payload=channel_payload,
        scheduled_at=scheduled_at,
        timezone=timezone
    )
    
    cursor.execute("""
    INSERT INTO calendar_events (
        id, org_id, brand_id, campaign_id, title, channel,
        scheduled_at, timezone, status, content_version, current_content_hash,
        approved_version, approved_content_hash, retry_count, created_by, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?, ?)
    """, (
        event_id, org_id, brand_id, campaign_id, title, channel,
        scheduled_at, timezone, status, content_version, current_content_hash,
        created_by, now, now
    ))
    
    cursor.execute("""
    INSERT INTO event_contents (event_id, channel_payload)
    VALUES (?, ?)
    ON CONFLICT(event_id) DO UPDATE SET channel_payload = excluded.channel_payload
    """, (
        event_id,
        json.dumps(channel_payload)
    ))
    
    conn.commit()
    conn.close()
    
    return get_calendar_event_by_id(event_id)

def get_calendar_event_by_id(event_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT e.*, c.channel_payload
    FROM calendar_events e
    LEFT JOIN event_contents c ON e.id = c.event_id
    WHERE e.id = ?
    """, (event_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    
    item = dict(row)
    try:
        item["channel_payload"] = json.loads(item["channel_payload"]) if item.get("channel_payload") else {}
    except Exception:
        item["channel_payload"] = {}
    return item

def get_calendar_events(
    org_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT e.*, c.channel_payload
    FROM calendar_events e
    LEFT JOIN event_contents c ON e.id = c.event_id
    WHERE 1=1
    """
    params = []
    
    if org_id:
        query += " AND e.org_id = ?"
        params.append(org_id)
    if brand_id:
        query += " AND e.brand_id = ?"
        params.append(brand_id)
    if status:
        query += " AND e.status = ?"
        params.append(status)
    if channel:
        query += " AND e.channel = ?"
        params.append(channel.lower())
    if start_date:
        query += " AND e.scheduled_at >= ?"
        params.append(start_date)
    if end_date:
        query += " AND e.scheduled_at <= ?"
        params.append(end_date)
        
    query += " ORDER BY e.scheduled_at ASC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        item = dict(r)
        try:
            item["channel_payload"] = json.loads(item["channel_payload"]) if item.get("channel_payload") else {}
        except Exception:
            item["channel_payload"] = {}
        result.append(item)
    return result

def update_calendar_event(event_id: str, updates: Dict[str, Any], updated_by_user: str = "founder@brand.com") -> Dict[str, Any]:
    current = get_calendar_event_by_id(event_id)
    if not current:
        raise ValueError("Calendar event not found")
        
    # Invariant: Published historical records are immutable
    if current.get("status") == "PUBLISHED":
        raise PermissionError("Cannot modify a historical published event. Duplicate event to create a new draft.")
    if current.get("status") == "PUBLISHING":
        raise PermissionError("Cannot modify an event currently being published.")
        
    conn = get_connection()
    cursor = conn.cursor()
    
    new_title = updates.get("title", current["title"])
    new_channel = (updates.get("channel", current["channel"])).lower()
    new_scheduled_at = updates.get("scheduled_at", current["scheduled_at"])
    new_timezone = updates.get("timezone", current["timezone"])
    new_channel_payload = updates.get("channel_payload") if "channel_payload" in updates else current["channel_payload"]
    
    new_hash = compute_calendar_event_hash(
        channel=new_channel,
        channel_payload=new_channel_payload,
        scheduled_at=new_scheduled_at,
        timezone=new_timezone
    )
    
    now = datetime.utcnow().isoformat()
    content_changed = (new_hash != current["current_content_hash"])
    
    if content_changed:
        # Increment version and invalidate prior approvals
        new_version = int(current["content_version"]) + 1
        new_status = "PENDING_VERIFICATION"
        new_approved_version = None
        new_approved_hash = None
        
        # Log mutation audit log
        audit_id = str(uuid.uuid4())
        cursor.execute("""
        INSERT INTO verification_audit_logs (
            id, event_id, org_id, user_id, user_role, action,
            content_version, content_hash, snapshot_payload, scheduled_at_snapshot, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_id, event_id, current["org_id"], updated_by_user, "editor", "MUTATED_RESET",
            new_version, new_hash, json.dumps(new_channel_payload), new_scheduled_at,
            "Event payload or timing mutated -> approval invalidated and reset to PENDING_VERIFICATION", now
        ))
    else:
        new_version = current["content_version"]
        new_status = updates.get("status", current["status"])
        new_approved_version = current["approved_version"]
        new_approved_hash = current["approved_content_hash"]
        
    cursor.execute("""
    UPDATE calendar_events
    SET title = ?,
        channel = ?,
        scheduled_at = ?,
        timezone = ?,
        status = ?,
        content_version = ?,
        current_content_hash = ?,
        approved_version = ?,
        approved_content_hash = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        new_title, new_channel, new_scheduled_at, new_timezone, new_status,
        new_version, new_hash, new_approved_version, new_approved_hash, now,
        event_id
    ))
    
    if "channel_payload" in updates:
        cursor.execute("""
        UPDATE event_contents
        SET channel_payload = ?
        WHERE event_id = ?
        """, (json.dumps(new_channel_payload), event_id))
        
    conn.commit()
    conn.close()
    
    return get_calendar_event_by_id(event_id)

def delete_calendar_event(event_id: str) -> bool:
    current = get_calendar_event_by_id(event_id)
    if not current:
        return False
    if current.get("status") == "PUBLISHED":
        raise PermissionError("Cannot delete historical published event. Record is immutable for audit compliance.")
    if current.get("status") == "PUBLISHING":
        raise PermissionError("Cannot delete an event currently being published.")
        
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
    cursor.execute("DELETE FROM event_contents WHERE event_id = ?", (event_id,))
    conn.commit()
    conn.close()
    return True

def duplicate_calendar_event(event_id: str, duplicated_by_user: str = "founder@brand.com") -> Dict[str, Any]:
    current = get_calendar_event_by_id(event_id)
    if not current:
        raise ValueError("Original calendar event not found")
        
    new_event_data = {
        "org_id": current["org_id"],
        "brand_id": current["brand_id"],
        "campaign_id": current.get("campaign_id"),
        "title": f"Copy of {current['title']}",
        "channel": current["channel"],
        "scheduled_at": datetime.utcnow().isoformat(),
        "timezone": current["timezone"],
        "status": "DRAFT",
        "channel_payload": current.get("channel_payload") or {},
        "created_by": duplicated_by_user
    }
    return create_calendar_event(new_event_data)

def approve_calendar_event(
    event_id: str,
    content_version: int,
    content_hash: str,
    user_id: str = "founder@brand.com",
    user_role: str = "reviewer",
    immediate_action: Optional[str] = None,
    rescheduled_at: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    current = get_calendar_event_by_id(event_id)
    if not current:
        raise ValueError("Calendar event not found")
        
    # Verify exact version and hash (Optimistic Concurrency & Integrity Check)
    if current["content_version"] != content_version or current["current_content_hash"] != content_hash:
        raise ValueError(
            f"Approval Conflict: Content has changed since preview (stale version {content_version} vs current {current['content_version']})."
        )
        
    if current["status"] in ["PUBLISHING", "PUBLISHED"]:
        raise ValueError(f"Cannot approve event with current status '{current['status']}'.")
        
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow()
    now_iso = now.isoformat()
    
    scheduled_dt = datetime.fromisoformat(current["scheduled_at"].replace("Z", "+00:00")).replace(tzinfo=None)
    
    # State Machine Semantics
    if rescheduled_at:
        # User explicitly supplied a new future timestamp
        new_scheduled_at = rescheduled_at
        new_hash = compute_calendar_event_hash(
            channel=current["channel"],
            channel_payload=current["channel_payload"],
            scheduled_at=new_scheduled_at,
            timezone=current["timezone"]
        )
        new_status = "SCHEDULED"
    elif scheduled_dt > now:
        # Future date: Transition to SCHEDULED
        new_scheduled_at = current["scheduled_at"]
        new_hash = content_hash
        new_status = "SCHEDULED"
    else:
        # Past date
        if immediate_action == "DISPATCH_NOW":
            new_scheduled_at = current["scheduled_at"]
            new_hash = content_hash
            new_status = "PUBLISHING" # explicitly authorized immediate dispatch
        else:
            conn.close()
            raise ValueError("Event scheduled time has passed. Must specify rescheduled_at or immediate_action='DISPATCH_NOW'.")
            
    cursor.execute("""
    UPDATE calendar_events
    SET status = ?,
        scheduled_at = ?,
        current_content_hash = ?,
        approved_version = ?,
        approved_content_hash = ?,
        updated_at = ?
    WHERE id = ? AND content_version = ?
    """, (
        new_status, new_scheduled_at, new_hash, content_version, new_hash, now_iso,
        event_id, content_version
    ))
    
    # Write Immutable Verification Log
    audit_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO verification_audit_logs (
        id, event_id, org_id, user_id, user_role, action,
        content_version, content_hash, snapshot_payload, scheduled_at_snapshot, notes, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id, event_id, current["org_id"], user_id, user_role, "APPROVED",
        content_version, new_hash, json.dumps(current["channel_payload"]), new_scheduled_at,
        notes or f"Human sign-off by {user_id} ({user_role})", now_iso
    ))
    
    conn.commit()
    conn.close()
    
    return get_calendar_event_by_id(event_id)

def reject_calendar_event(
    event_id: str,
    reason: str,
    user_id: str = "founder@brand.com",
    user_role: str = "reviewer"
) -> Dict[str, Any]:
    current = get_calendar_event_by_id(event_id)
    if not current:
        raise ValueError("Calendar event not found")
        
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()
    
    cursor.execute("""
    UPDATE calendar_events
    SET status = 'REJECTED',
        updated_at = ?
    WHERE id = ?
    """, (now_iso, event_id))
    
    audit_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO verification_audit_logs (
        id, event_id, org_id, user_id, user_role, action,
        content_version, content_hash, snapshot_payload, scheduled_at_snapshot, notes, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id, event_id, current["org_id"], user_id, user_role, "REJECTED",
        current["content_version"], current["current_content_hash"],
        json.dumps(current["channel_payload"]), current["scheduled_at"],
        reason, now_iso
    ))
    
    conn.commit()
    conn.close()
    
    return get_calendar_event_by_id(event_id)

def bulk_approve_calendar_events(
    items: List[Dict[str, Any]],
    user_id: str = "founder@brand.com",
    user_role: str = "reviewer"
) -> Dict[str, Any]:
    results = []
    success_count = 0
    failed_count = 0
    
    for item in items:
        eid = item.get("event_id")
        v = item.get("content_version")
        h = item.get("content_hash")
        try:
            approved = approve_calendar_event(
                event_id=eid,
                content_version=v,
                content_hash=h,
                user_id=user_id,
                user_role=user_role,
                notes="Bulk verified by reviewer"
            )
            results.append({"event_id": eid, "status": "approved", "event": approved})
            success_count += 1
        except Exception as e:
            results.append({"event_id": eid, "status": "failed", "error": str(e)})
            failed_count += 1
            
    return {
        "total_requested": len(items),
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results
    }

def claim_scheduled_events_for_worker(worker_id: str, batch_size: int = 10) -> List[Dict[str, Any]]:
    """
    Atomic single-statement query claiming due SCHEDULED events where invariant holds:
    approved_version == content_version AND approved_content_hash == current_content_hash
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()
    
    # 5 minute lease timeout
    cursor.execute("""
    SELECT id FROM calendar_events
    WHERE status = 'SCHEDULED'
      AND scheduled_at <= ?
      AND approved_version IS NOT NULL
      AND approved_version = content_version
      AND approved_content_hash = current_content_hash
      AND (lock_acquired_at IS NULL OR lock_acquired_at < datetime(?, '-5 minutes'))
    ORDER BY scheduled_at ASC
    LIMIT ?
    """, (now_iso, now_iso, batch_size))
    
    due_ids = [row["id"] for row in cursor.fetchall()]
    claimed = []
    
    for eid in due_ids:
        cursor.execute("""
        UPDATE calendar_events
        SET status = 'PUBLISHING',
            lock_acquired_at = ?,
            lock_worker_id = ?,
            updated_at = ?
        WHERE id = ?
          AND status = 'SCHEDULED'
          AND approved_version = content_version
          AND approved_content_hash = current_content_hash
        """, (now_iso, worker_id, now_iso, eid))
        
        if cursor.rowcount == 1:
            claimed.append(eid)
            
    conn.commit()
    conn.close()
    
    return [get_calendar_event_by_id(eid) for eid in claimed]

def recover_expired_worker_leases() -> int:
    """
    Periodic lease recovery maintenance:
    Finds PUBLISHING events where worker lease expired (> 5 min) and recovers to SCHEDULED or PUBLISH_FAILED.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat()
    
    cursor.execute("""
    SELECT id, retry_count FROM calendar_events
    WHERE status = 'PUBLISHING'
      AND lock_acquired_at < datetime(?, '-5 minutes')
    """, (now_iso,))
    
    expired = cursor.fetchall()
    recovered_count = 0
    
    for row in expired:
        eid = row["id"]
        retries = int(row["retry_count"]) + 1
        if retries < 3:
            cursor.execute("""
            UPDATE calendar_events
            SET status = 'SCHEDULED',
                lock_acquired_at = NULL,
                lock_worker_id = NULL,
                retry_count = ?,
                updated_at = ?
            WHERE id = ?
            """, (retries, now_iso, eid))
        else:
            cursor.execute("""
            UPDATE calendar_events
            SET status = 'PUBLISH_FAILED',
                retry_count = ?,
                updated_at = ?
            WHERE id = ?
            """, (retries, now_iso, eid))
        recovered_count += 1
        
    conn.commit()
    conn.close()
    return recovered_count

def get_verification_audit_logs_for_event(event_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM verification_audit_logs
    WHERE event_id = ?
    ORDER BY created_at DESC
    """, (event_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Initialize database on module load
init_db()
