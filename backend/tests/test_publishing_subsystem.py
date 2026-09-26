import asyncio
from uuid import uuid4
from app.storage.unit_of_work import UnitOfWork
from app.services.publishing.publish_service import PublishService
from app.services.publishing.worker_daemon import WorkerDaemon
from app.services.publishing.reconciler import PublishReconciler

def test_publish_operation_creation_and_uow_commit():
    """Verifies PublishOperation creation and atomic UnitOfWork state/audit/outbox emission."""
    uow = UnitOfWork(user_id="usr_pub_01", workspace_id="00000000-0000-0000-0000-000000000001", role="CONTENT_AUTHOR")
    service = PublishService(uow=uow)

    with uow.begin():
        op = service.create_publish_operation(
            workspace_id="00000000-0000-0000-0000-000000000001",
            actor_id="usr_pub_01",
            content_version_id="cv_123",
            content_version_hash="hash_cv_123",
            claims_state_hash="claims_hash_123",
            destination_channel="ch_linkedin",
            destination_account_id="00000000-0000-0000-0000-000000000002",
            schedule_slot_utc="2026-09-22T10:00:00Z"
        )

    assert op["execution_state"] == "READY"
    assert op["provider_idempotency_state"] == "NEVER_ATTEMPTED"
    assert op["generation"] == 1
    assert len(uow._audit_records) == 0  # Cleared after commit
    assert len(uow._outbox_records) == 0 # Cleared after commit

def test_worker_claim_increments_generation_atomically():
    """Verifies that worker claiming increments generation from 1 to 2 atomically."""
    uow = UnitOfWork()
    service = PublishService(uow=uow)
    op = service.create_publish_operation(
        workspace_id="00000000-0000-0000-0000-000000000001",
        actor_id="usr_pub_01",
        content_version_id="cv_123",
        content_version_hash="hash_cv_123",
        claims_state_hash="claims_hash_123",
        destination_channel="ch_linkedin",
        destination_account_id="00000000-0000-0000-0000-000000000002",
        schedule_slot_utc="2026-09-22T10:00:00Z"
    )

    daemon = WorkerDaemon(worker_id="worker_node_A", uow=uow)

    async def run_worker():
        with uow.begin():
            res = await daemon.execute_job(
                publish_operation=op,
                content_body="Test post body",
                expected_content_version_hash="hash_cv_123",
                expected_claims_state_hash="claims_hash_123"
            )
            return res

    result = asyncio.run(run_worker())
    assert result["generation"] == 2
    assert result["claimed_by_worker"] == "worker_node_A"
    assert result["execution_state"] == "PUBLISHED"
    assert result["provider_idempotency_state"] == "SUCCESSFULLY_PROCESSED"

def test_stale_generation_cannot_commit_provider_result():
    """Verifies that a worker with a stale generation cannot commit results (generation fencing)."""
    uow = UnitOfWork()
    op = {
        "id": str(uuid4()),
        "workspace_id": "00000000-0000-0000-0000-000000000001",
        "content_version_id": "cv_123",
        "content_version_hash": "hash_cv_123",
        "claims_state_hash": "claims_hash_123",
        "destination_channel": "ch_linkedin",
        "destination_account_id": str(uuid4()),
        "execution_state": "READY",
        "provider_idempotency_state": "NEVER_ATTEMPTED",
        "generation": 5
    }

    daemon = WorkerDaemon(worker_id="worker_node_Stale", uow=uow)

    async def run_stale():
        op_copy = dict(op)
        # Simulate worker acquiring generation 6, but during execution another worker claims generation 7
        op_copy["active_db_generation"] = 7
        with uow.begin():
            await daemon.execute_job(
                publish_operation=op_copy,
                content_body="Test post body",
                expected_content_version_hash="hash_cv_123",
                expected_claims_state_hash="claims_hash_123"
            )

    raised = False
    try:
        asyncio.run(run_stale())
    except Exception as e:
        if "GENERATION_FENCE_FAILURE" in str(e):
            raised = True

    assert raised, "Expected GENERATION_FENCE_FAILURE exception was not raised"

def test_network_timeout_transitions_to_unknown_outcome():
    """Verifies that provider network timeout transitions provider_idempotency_state to UNKNOWN_OUTCOME and lifecycle to DISPATCHING."""
    uow = UnitOfWork()
    op = {
        "id": str(uuid4()),
        "workspace_id": "00000000-0000-0000-0000-000000000001",
        "content_version_id": "cv_123",
        "content_version_hash": "hash_cv_123",
        "claims_state_hash": "claims_hash_123",
        "destination_channel": "ch_linkedin",
        "destination_account_id": str(uuid4()),
        "execution_state": "READY",
        "provider_idempotency_state": "NEVER_ATTEMPTED",
        "generation": 1
    }

    daemon = WorkerDaemon(worker_id="worker_node_Timeout", uow=uow)

    async def run_timeout():
        with uow.begin():
            return await daemon.execute_job(
                publish_operation=op,
                content_body="force_timeout post body",
                expected_content_version_hash="hash_cv_123",
                expected_claims_state_hash="claims_hash_123"
            )

    result = asyncio.run(run_timeout())
    assert result["execution_state"] == "DISPATCHING"
    assert result["provider_idempotency_state"] == "UNKNOWN_OUTCOME"

def test_unknown_outcome_reconciliation_without_blind_retry():
    """Verifies that Reconciler polls provider status for UNKNOWN_OUTCOME without blind retries."""
    uow = UnitOfWork()
    op = {
        "id": str(uuid4()),
        "workspace_id": "00000000-0000-0000-0000-000000000001",
        "content_version_id": "cv_123",
        "content_version_hash": "hash_cv_123",
        "claims_state_hash": "claims_hash_123",
        "destination_channel": "ch_linkedin",
        "destination_account_id": str(uuid4()),
        "execution_state": "DISPATCHING",
        "provider_idempotency_state": "UNKNOWN_OUTCOME",
        "generation": 2
    }

    reconciler = PublishReconciler(uow=uow)

    async def run_reconcile():
        with uow.begin():
            return await reconciler.reconcile_operation(
                publish_operation=op,
                reconciler_worker_id="reconciler_node_01"
            )

    result = asyncio.run(run_reconcile())
    assert result["generation"] == 3
    assert result["execution_state"] == "PUBLISHED"
    assert result["provider_idempotency_state"] == "SUCCESSFULLY_PROCESSED"
    assert result["external_post_id"] is not None
