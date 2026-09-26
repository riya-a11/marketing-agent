import logging
from contextlib import contextmanager
from typing import Optional, Generator
from app.database import supabase

logger = logging.getLogger("session_context")

def set_authenticated_session_context(user_id: str, workspace_id: str, role: str, db_session=None):
    """
    Sets PostgreSQL session context for Row Level Security (RLS) policies.
    Executes security_vault.set_authenticated_session_context() or sets GUC variables.
    """
    if db_session:
        try:
            db_session.execute(
                "SELECT security_vault.set_authenticated_session_context(:user_id, :workspace_id, :role)",
                {"user_id": user_id, "workspace_id": workspace_id, "role": role}
            )
            logger.debug(f"Bound RLS context in SQL session: user={user_id}, workspace={workspace_id}, role={role}")
        except Exception as e:
            logger.warning(f"Failed to execute security_vault procedure, setting session config parameters: {e}")
            try:
                db_session.execute("SELECT set_config('app.current_user_id', :u, true)", {"u": user_id})
                db_session.execute("SELECT set_config('app.current_workspace_id', :w, true)", {"w": workspace_id})
                db_session.execute("SELECT set_config('app.current_user_role', :r, true)", {"r": role})
            except Exception as ex:
                logger.warning(f"Failed to set GUC parameters: {ex}")
    elif supabase:
        try:
            supabase.rpc("set_authenticated_session_context", {
                "p_user_id": user_id,
                "p_workspace_id": workspace_id,
                "p_role": role
            }).execute()
        except Exception as e:
            logger.debug(f"Supabase RPC session context skipped/mocked: {e}")

@contextmanager
def session_context_scope(user_id: str, workspace_id: str, role: str, db_session=None) -> Generator[None, None, None]:
    try:
        set_authenticated_session_context(user_id, workspace_id, role, db_session=db_session)
        yield
    finally:
        pass
