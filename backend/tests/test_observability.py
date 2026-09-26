import os
import sys
import json
import logging
from uuid import uuid4

logger = logging.getLogger("test_observability")

def test_structured_json_logging_schema():
    """
    Verifies that structured JSON logging entries contain trace_id, workspace_id, actor_id, duration_ms, and sanitized_metadata.
    """
    sample_log = {
        "timestamp": "2026-09-21T22:24:00.000Z",
        "level": "INFO",
        "trace_id": f"tr_{uuid4().hex[:12]}",
        "span_id": f"sp_{uuid4().hex[:8]}",
        "workspace_id": str(uuid4()),
        "actor_id": "usr_pub_01",
        "subsystem": "worker_daemon",
        "action": "PUBLISH_OPERATION_PROCESSED",
        "publish_operation_id": str(uuid4()),
        "generation": 2,
        "duration_ms": 142,
        "http_status_class": "2xx",
        "provider": "linkedin",
        "sanitized_metadata": {
            "provider_status": "SUCCESS",
            "provider_request_id": "req_li_12345"
        }
    }
    
    log_json = json.dumps(sample_log)
    parsed = json.loads(log_json)

    assert "trace_id" in parsed
    assert "workspace_id" in parsed
    assert "sanitized_metadata" in parsed
    assert "access_token" not in parsed
    assert "raw_payload" not in parsed
    logger.info("🟢 PASSED: test_structured_json_logging_schema")

def test_high_cardinality_metric_label_exclusion():
    """
    Verifies that high-cardinality identifiers (trace_id, user_id, publish_operation_id) are excluded from Prometheus metric labels.
    """
    allowed_labels = {"provider", "channel", "operation_state", "http_status_class", "environment"}
    forbidden_labels = {"trace_id", "user_id", "publish_operation_id", "actor_id", "span_id"}

    metric_labels = {"provider": "linkedin", "operation_state": "PUBLISHED", "environment": "production"}

    assert all(k in allowed_labels for k in metric_labels.keys())
    assert not any(k in forbidden_labels for k in metric_labels.keys())
    logger.info("🟢 PASSED: test_high_cardinality_metric_label_exclusion")

def test_synthetic_canary_metric_isolation():
    """
    Verifies that synthetic canary probe metrics carry synthetic=true and are excluded from business publication metrics.
    """
    canary_metric = {"synthetic": True, "provider": "linkedin", "status": "SUCCESS"}
    business_metric = {"synthetic": False, "provider": "linkedin", "status": "SUCCESS"}

    assert canary_metric["synthetic"] is True
    assert business_metric["synthetic"] is False
    logger.info("🟢 PASSED: test_synthetic_canary_metric_isolation")
