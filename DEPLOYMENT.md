# Marketing OS — Production Operations & Deployment Runbook

This guide contains the official operational runbook and standard operating procedures (SOP) for deploying and maintaining Marketing OS across staging and production environments.

---

## 1. Reference Architecture & Topology

```
                         ┌─────────────────────────┐
                         │   Client Web Browser    │
                         └────────────┬────────────┘
                                      │ HTTPS (TLS 1.3)
                                      ▼
                         ┌─────────────────────────┐
                         │  Frontend Edge (Next.js)│
                         │   Standalone Node 20    │
                         └────────────┬────────────┘
                                      │ HTTPS / Internal Ingress
                                      ▼
                         ┌─────────────────────────┐
                         │ API Gateway / FastAPI   │
                         │   Uvicorn Workers       │
                         └───┬─────────────┬───────┘
                             │             │
                  ┌──────────┘             └──────────┐
                  ▼                                   ▼
      ┌──────────────────────┐             ┌──────────────────────┐
      │   PostgreSQL 16      │             │       Redis 7        │
      │  Primary + Replica   │             │ Distributed Queue    │
      └──────────┬───────────┘             └──────────┬───────────┘
                 │                                    │
                 │                                    ▼
                 │                         ┌──────────────────────┐
                 │                         │  Publishing Workers  │
                 │                         │ (Dedicated Daemons)  │
                 │                         └──────────┬───────────┘
                 │                                    │
                 ▼                                    ▼
      ┌──────────────────────┐             ┌──────────────────────┐
      │ S3-Compatible Media  │             │ Third-Party Networks │
      │ Object Storage (R2)  │             │ (LinkedIn, X, Meta)  │
      └──────────────────────┘             └──────────────────────┘
```

---

## 2. Quickstart: Local Development & Self-Hosted Deployment

### Prerequisites:
- Docker Engine $\ge 24.0$
- Docker Compose $\ge 2.20$

### 1-Command Startup:
```bash
# Clone and enter directory
cd "marketing-os"

# Copy environment template
cp backend/.env.example backend/.env

# Build and start all services in background
docker compose up -d --build
```

### Health Probes:
- Frontend: `http://localhost:3000`
- Backend Liveness: `http://localhost:8000/health` (HTTP 200)
- Backend Readiness: `http://localhost:8000/ready` (HTTP 200 when PostgreSQL and Redis are ready)

---

## 3. Production Deployment Guide (Cloud Run / ECS + Vercel)

### Recommended Production Targets:
- **Frontend**: Vercel / Cloudflare Pages (utilizing Next.js standalone SSR)
- **API Service**: Google Cloud Run / AWS ECS Fargate
- **Publishing Workers**: Dedicated Cloud Run / ECS worker task pool
- **Database**: Managed PostgreSQL 16 (AWS RDS / Neon / Supabase)
- **Queue & Cache**: Managed Redis 7 (AWS ElastiCache / Upstash)
- **Media Assets**: Cloudflare R2 / AWS S3

---

## 4. Production Environment Configuration Checklist

The backend enforces strict **fail-fast validation** on startup in production. If any required invariant or minimum entropy threshold is violated, the container terminates immediately.

| Environment Variable | Production Requirement | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enables strict CORS, security headers, and live publishing adapters. |
| `ALLOWED_ORIGINS` | `["https://app.yourdomain.com"]` | **JSON array of HTTPS origins**. Prohibits `*`, `localhost`, and `127.0.0.1`. |
| `JWT_SECRET` | $\ge 32$ bytes entropy | Cryptographic key for signing user sessions. Rejects default strings. |
| `TOKEN_ENCRYPTION_KEY`| $\ge 32$ bytes entropy | AES key for encrypting stored OAuth refresh tokens. Rejects default strings. |
| `DATABASE_URL` | `postgresql://...` | Connection URI to managed PostgreSQL 16. |
| `REDIS_URL` | `redis://...` | Connection URI to managed Redis 7 instance. |
| `OPENAI_API_KEY` | `sk-...` | Enterprise API key for AI generation engines. |

### Generating Cryptographically Secure Secrets:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 5. Database Schema Migrations & Expand-Contract Invariant

### Rules:
1. **Never run migrations from application startup**: Migrations must be run out-of-band by a dedicated CI/CD job before releasing new container revisions.
2. **Expand-Contract Zero-Downtime Rule**:
   - **Phase 1 (Expand)**: Add new columns as `NULLABLE` or with safe defaults. Add new tables.
   - **Phase 2 (Deploy)**: Deploy application code compatible with both old and new schema.
   - **Phase 3 (Contract)**: In a subsequent release, clean up deprecated columns.

### Running Migrations:
```bash
# Execute migration script against target database
python -m app.storage.migrate_postgres
```

---

## 6. Worker Execution & Graceful Draining (`SIGTERM`)

Publishing workers run under `WorkerDaemon`. When a container deployment or autoscaling scale-down event occurs:
1. Orchestrator sends `SIGTERM`.
2. Worker immediately stops accepting new publishing operations from the queue.
3. In-flight HTTP dispatches are granted a bounded 30-second drain window.
4. If dispatch cannot complete within timeout, the lease is safely recovered to `SCHEDULED` for sibling worker execution.
5. Worker flushes telemetry and cleanly terminates.

---

## 7. Disaster Recovery & Coordinated Backup Runbook

### 1. PostgreSQL PITR & Object Storage Replication:
- **PostgreSQL PITR**: Continuous Write-Ahead Log (WAL) archiving to cloud storage enables point-in-time recovery to any second within the past 30 days (RPO $< 5\text{ min}$, RTO $< 30\text{ min}$).
- **Object Storage Replication**: Production media asset buckets enable object versioning and asynchronous cross-region replication to a secondary recovery region.
- **Deletion Protection**: Object Lock and MFA Delete policies prohibit permanent asset destruction without multi-party administrative authorization.

### 2. Coordinated Monthly Restore Drill:
On the 1st of every month, conduct an automated restore verification drill:
1. Restore a database snapshot into an isolated test cluster.
2. Restore the asset bucket from the secondary replica.
3. Validate that all `media_assets.object_key` pointers in the restored PostgreSQL instance resolve to valid, accessible objects in the restored storage bucket.
4. Execute the full integrity and publishing verification suite:
   ```bash
   python test_full_testing_strategy.py
   ```

---

## 8. Rollback Procedure (< 120s Automated Target)

If container readiness probes fail during deployment:
```bash
# Cloud Run immediate traffic rollback:
gcloud run services update-traffic marketing-os-api \
    --to-revisions PREVIOUS_HEALTHY_REVISION=100

# Docker Compose manual rollback:
docker compose stop backend-api
docker compose up -d --no-deps backend-api
```
