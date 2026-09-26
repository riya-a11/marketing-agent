import sys
import os
import inspect
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_runner")

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import tests.test_auth_security_matrix as test_auth
import tests.test_publishing_subsystem as test_pub
import tests.test_migrations as test_mig
import tests.test_observability as test_obs
import tests.test_staging_reliability as test_rel

def run_all_tests():
    test_modules = [
        ("test_auth_security_matrix.py", test_auth),
        ("test_publishing_subsystem.py", test_pub),
        ("test_migrations.py", test_mig),
        ("test_observability.py", test_obs),
        ("test_staging_reliability.py", test_rel)
    ]
    total_passed = 0
    total_failed = 0

    for mod_name, mod_obj in test_modules:
        test_funcs = [
            obj for name, obj in inspect.getmembers(mod_obj, inspect.isfunction)
            if name.startswith("test_")
        ]
        logger.info(f"\n--- Running {len(test_funcs)} test functions in {mod_name} ---")
        for func in test_funcs:
            try:
                func()
                logger.info(f"🟢 PASSED: {func.__name__}")
                total_passed += 1
            except Exception as e:
                logger.error(f"🔴 FAILED: {func.__name__} - {e}")
                total_failed += 1

    logger.info(f"\nFinal Test Summary: {total_passed} PASSED, {total_failed} FAILED across test suites.")
    if total_failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()
