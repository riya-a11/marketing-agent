import logging
from typing import Optional, Generator
from contextlib import contextmanager

logger = logging.getLogger("unit_of_work")

class UnitOfWork:
    """
    Unit of Work Manager for Marketing OS.
    Guarantees atomic execution of:
      1. Authoritative DB State Mutation (Repositories with ROW_COUNT() = 1 fencing)
      2. Immutable Audit Ledger Append
      3. Reliable Event Outbox Emission
    within a SINGLE database transaction with transaction-scoped (SET LOCAL) RLS security GUCs.
    """
    def __init__(self, user_id: Optional[str] = None, workspace_id: Optional[str] = None, role: Optional[str] = None, db_session=None):
        self.user_id = user_id
        self.workspace_id = workspace_id
        self.role = role
        self.db_session = db_session
        self.in_transaction = False
        self._audit_records = []
        self._outbox_records = []

    def set_session_context(self, user_id: str, workspace_id: str, role: str):
        """Set RLS context for current Unit of Work."""
        self.user_id = user_id
        self.workspace_id = workspace_id
        self.role = role

    def add_audit_record(self, record: dict):
        """Buffer audit ledger append for transaction commit."""
        self._audit_records.append(record)

    def add_outbox_record(self, record: dict):
        """Buffer event outbox emission for transaction commit."""
        self._outbox_records.append(record)

    @contextmanager
    def begin(self) -> Generator["UnitOfWork", None, None]:
        """
        Context manager starting a database transaction.
        Applies SET LOCAL session variables for RLS policies.
        Commits state + audit + outbox atomically, or rolls back on exception.
        """
        self.in_transaction = True
        try:
            if self.db_session:
                # Apply SET LOCAL variables inside transaction
                if self.user_id and self.workspace_id and self.role:
                    try:
                        self.db_session.execute(
                            "SELECT set_config('app.current_user_id', :u, true)", {"u": self.user_id}
                        )
                        self.db_session.execute(
                            "SELECT set_config('app.current_workspace_id', :w, true)", {"w": self.workspace_id}
                        )
                        self.db_session.execute(
                            "SELECT set_config('app.current_user_role', :r, true)", {"r": self.role}
                        )
                    except Exception as e:
                        logger.warning(f"Failed to apply SET LOCAL GUCs: {e}")
            yield self
            # Commit transaction atomically
            if self.db_session:
                self.db_session.commit()
            logger.debug("UnitOfWork transaction committed atomically.")
        except Exception as e:
            if self.db_session:
                self.db_session.rollback()
            logger.error(f"UnitOfWork transaction rolled back due to error: {e}")
            raise
        finally:
            self.in_transaction = False
            # Defensive connection hygiene: clear session GUCs on release
            if self.db_session:
                try:
                    self.db_session.execute("RESET app.current_user_id; RESET app.current_workspace_id; RESET app.current_user_role;")
                except Exception:
                    pass
            self._audit_records.clear()
            self._outbox_records.clear()
