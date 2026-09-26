import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests import test_auth_and_authorization
from tests import test_auth_security_matrix

def run_all_tests():
    test_funcs = [
        # Base Auth & Lifecycle Tests
        ("test_password_hashing_pbkdf2", test_auth_and_authorization.test_password_hashing_pbkdf2),
        ("test_jwt_token_lifecycle_and_revocation", test_auth_and_authorization.test_jwt_token_lifecycle_and_revocation),
        ("test_auth_signup_login_logout_cookies", test_auth_and_authorization.test_auth_signup_login_logout_cookies),
        ("test_password_recovery_workflow", test_auth_and_authorization.test_password_recovery_workflow),
        ("test_backend_authorization_bypass_prevention", test_auth_and_authorization.test_backend_authorization_bypass_prevention),

        # Security Hardening Matrix Vectors (ST-AUTH-01 through ST-AUTH-09)
        ("ST-AUTH-01: Concurrent Refresh Token Replay Race & Family Revocation", test_auth_security_matrix.test_st_auth_01_concurrent_refresh_replay_and_family_revocation),
        ("ST-AUTH-02: Multi-Verb & Mixed-Auth CSRF Protection", test_auth_security_matrix.test_st_auth_02_multi_verb_and_mixed_auth_csrf),
        ("ST-AUTH-03: Authoritative Database Workspace Membership", test_auth_security_matrix.test_st_auth_03_authoritative_db_workspace_membership),
        ("ST-AUTH-04: Full RBAC Permission Matrix Including SYSTEM_REAPER", test_auth_security_matrix.test_st_auth_04_full_rbac_permission_matrix_including_system_reaper),
        ("ST-AUTH-05: Password Reset Session Revocation", test_auth_security_matrix.test_st_auth_05_password_reset_session_revocation),
        ("ST-AUTH-06: Scope-Bound Dual-Actor Grant Replay & Mismatch", test_auth_security_matrix.test_st_auth_06_scope_bound_dual_actor_grant_replay_and_mismatch),
        ("ST-AUTH-07: Ingress mTLS & Worker Identity Binding", test_auth_security_matrix.test_st_auth_07_ingress_mtls_and_worker_identity_binding),
        ("ST-AUTH-08: Concurrent Grant JTI Replay Race Condition", test_auth_security_matrix.test_st_auth_08_concurrent_grant_jti_replay),
        ("ST-AUTH-09: Pooled DB Session Context Isolation", test_auth_security_matrix.test_st_auth_09_pooled_db_session_context_isolation),
    ]

    passed = 0
    failed = 0
    print("==========================================================")
    print("   MARKETING OS — PRODUCTION SECURITY TEST MATRIX   ")
    print("==========================================================")
    for name, func in test_funcs:
        try:
            func()
            print(f"  [PASSED] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAILED] {name} -> {e}")
            failed += 1
            import traceback
            traceback.print_exc()

    print("----------------------------------------------------------")
    print(f"Summary: {passed} PASSED, {failed} FAILED.")
    print("==========================================================")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()
