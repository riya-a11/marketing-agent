# Security and Functional Review

**Scope:** Static review of the supplied project and X publishing attachments. This is not a penetration test or a live X API test.

## Overall assessment

| Area | Assessment |
|---|---:|
| Security for public production deployment | **2/10 - high risk** |
| Code quality / maintainability | **4/10 - prototype quality** |
| Real end-to-end product functionality | **Approximately 20-30%** |

The project is a UI/demo scaffold. Most screens exist, but key backend behavior is mocked and server-side controls are missing. These percentages are review estimates, not measured test coverage.

## Highest-priority findings

### Critical - vulnerable JavaScript dependency tree

The supplied review reported 19 dependency audit findings: 1 critical, 16 high, and 2 moderate, including the direct `next` dependency at 14.2.3. Review the current audit output and update the lockfile with tests; do not blindly apply major-version upgrades.

### High - publishing endpoint has no authentication or rate limit

`POST /api/v1/publish/x` uses one server-side `X_ACCESS_TOKEN` and does not authenticate callers. If deployed publicly, callers may publish as the configured account. Protect the route with verified user sessions, user-specific X authorization, and abuse controls before deployment.

### High - caller-controlled `video_url` creates SSRF and resource-exhaustion risk

The endpoint downloads the supplied URL without restricting hosts/redirects, checking public IP destinations, validating media type, or limiting bytes. Use an allowlisted object-storage source or enforce HTTPS, public-address checks for every redirect, accepted media types, strict size limits, and bounded processing/concurrency.

### High - protect environment files

The root `.env` contains credentials and must not be committed. A root `.gitignore` is now included for `.env` files, with `.env.example` as a placeholder template. Confirm that no secrets were previously committed and keep Supabase Row Level Security correctly configured.

## Other important issues

- The X integration uses one global token. Confirm it is an X user-context token with the required write and media permissions; per-user OAuth is needed for multiple accounts.
- Frontend Supabase configuration uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, while the backend `.env` uses `SUPABASE_URL` and `SUPABASE_KEY`. Configure frontend values separately and never expose a service-role key publicly.
- FastAPI has no CORS configuration; cross-origin deployments need an exact frontend-origin allowlist.
- Backend routes generally lack authentication and authorization.
- Login attempts to sign up after invalid credentials, which can confuse users.
- Request inputs and error responses need stricter validation and safe client-facing handling.

## Functional reality

- Content generation and interview endpoints return fixed sample data; brand profile and campaigns are not persisted.
- Video rendering is a mock that returns `https://example.com/rendered_video.mp4`; the selected settings are not used to create a video.
- The “Download MP4” control has no download handler.
- The X publishing path is connected in the backend and frontend, but it has not been tested against the live API. The local X token is blank, and media publishing cannot work until a real renderer provides a reachable MP4.
- No backend automated tests currently cover publishing.

## Recommended order of work

1. Add authentication, per-user authorization, and rate limits to API routes; use per-user X OAuth for multiple accounts.
2. Restrict video URLs and enforce media size/type/time limits.
3. Review and patch JavaScript dependency advisories; rerun audit, lint, typecheck, build, and tests.
4. Confirm `.env` is untracked and verify Supabase RLS policies.
5. Replace mock content/render endpoints and add integration tests for the render-to-X workflow.