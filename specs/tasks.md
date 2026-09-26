# Tasks: Marketing OS Core Product & Studio Engine

**Parent Spec**: [specs/001-marketing-os-core.md](./001-marketing-os-core.md)  
**Parent Plan**: [implementation_plan.md](../../.gemini/antigravity/brain/6716f4ec-b0d3-434f-b72e-9175c8643d8a/implementation_plan.md)  
**Status**: Ready for Execution  
**Framework**: GitHub Spec Kit (`speckit-tasks`)

---

## Format: `[TaskID] [Parallel?] [Story] Description`

- **[P]**: Can run in parallel without blocking other tasks.
- **[Story]**: User story or functional domain mapping.

---

## Phase 1: Setup & Governance Infrastructure

- [x] **T001** Initialize GitHub Spec Kit (`.specify/`) with project constitution and governance principles.
- [x] **T002** Configure Emil Kowalski semantic CSS tokens and custom cubic-bezier curves in `frontend/src/app/globals.css`.
- [x] **T003** [P] Set up multi-tenant SQLite database schema with foreign key isolation in `backend/app/storage/db.py`.

---

## Phase 2: Foundational Domain Entities & Invariants (Blocking)

- [x] **T004** Implement domain entities for `ClaimEntity`, `EvidenceNode`, and `ProvenanceStatus` in `backend/app/domain/claims/`.
- [x] **T005** [P] Implement `CampaignAggregate` and immutable `VersionSnapshot` models in `backend/app/domain/campaigns/`.
- [x] **T006** [P] Implement `PublicationBatch` and `PlatformItemState` hierarchy in `backend/app/domain/publishing/`.
- [x] **T007** Implement AES-256-GCM token encryption and signed OAuth state manager in `backend/app/services/security/`.
- [x] **T008** Enforce strict tenant authorization invariant (I8) across all database queries requiring `organization_id`.

---

## Phase 3: User Story 1 (P0) — "What happened?" & Strategic Angle Ingestion

**Goal**: As a solo founder, I can enter what my company shipped ($\le 2,000$ chars) and receive 3 distinct narrative angles with evidence-based rationale.

- [x] **T009** [US1] Create `StrategicAngleEngine` in `backend/app/services/intelligence/` to extract Customer Outcome, Founder Story, and Product Milestone.
- [x] **T010** [US1] Expose `POST /api/v1/content/analyze-update` endpoint in `backend/app/api/content.py`.
- [x] **T011** [US1] Build Studio Step 1 ("What happened?") clean input with character limits and inline Otto card in `frontend/src/app/dashboard/page.tsx`.
- [x] **T012** [US1] Build Studio Step 2 ("I found 3 possible stories") cards with ⭐ Recommended badge and Otto "Why?" reasoning panel.

---

## Phase 4: User Story 2 (P0) — Multi-Channel Campaign Director

**Goal**: As a founder, selecting a strategic angle generates a synchronized multi-channel campaign package across LinkedIn, X, Instagram, and Video.

- [x] **T013** [US2] Implement `CampaignDirector` service in `backend/app/services/campaigns/` enforcing invariant I1 (Single Strategic Angle).
- [x] **T014** [US2] Expose `POST /api/v1/content/generate-campaign-package` endpoint in `backend/app/api/content.py`.
- [x] **T015** [US2] Build Studio Step 3 Campaign Editor with channel tabs (`LinkedIn`, `X`, `Instagram`), rich editor, and live feed preview graphics.

---

## Phase 5: User Story 3 (P0) — Claims Registry & Evidence Verification Gate

**Goal**: As a founder, my campaigns are checked against Brand Memory so that unverified superlatives are blocked before publishing.

- [x] **T016** [US3] Implement `ClaimsAnalyzer` and `VerificationGateService` in `backend/app/services/intelligence/`.
- [x] **T017** [US3] Classify claims into `VERIFIED`, `NEEDS_EVIDENCE`, and `PROHIBITED` with provenance and freshness tracking (`FRESH`, `AGING`, `STALE`, `EXPIRED`).
- [x] **T018** [US3] Enforce invariant I3 & I4: Content mutations after review reset approval state; prohibited claims block `PUBLISH_READY`.
- [x] **T019** [US3] Distinguish `ALLOWED_BY_EVIDENCE` from `ALLOWED_BY_FOUNDER_OVERRIDE` in publication decision logs.

---

## Phase 6: User Story 4 (P0) — Otto Contextual Decision Engine

**Goal**: Otto provides in-flow marketing advice using the strict **Observation $\rightarrow$ Reason $\rightarrow$ Action** formula.

- [x] **T020** [US4] Implement `OttoAdvisor.tsx` 3D expressive robot avatar with mood states (`idle`, `thinking`, `found_something`, `warning`, `success`).
- [x] **T021** [US4] Build in-flow contextual intervention cards with 1-click action triggers (`[Rewrite with this angle →]`).

---

## Phase 7: User Story 5 (P0) — Multi-Tenant Distribution & Failure Isolation

**Goal**: As a founder, I can publish across connected accounts via Direct Native API (LinkedIn, X, Instagram) or n8n webhook with failure isolation.

- [x] **T022** [US5] Implement `PublisherFactory` and platform adapters (`LinkedInPosts`, `Xv2`, `InstagramContainer`, `N8NAdapter`) with idempotency keys (`idemp:{campaign_id}:{platform}:{version_no}`).
- [x] **T023** [US5] Implement `PublicationBatchService` tracking item states (`QUEUED`, `PUBLISHING`, `SUCCEEDED`, `FAILED`).
- [x] **T024** [US5] Enforce invariant I6: Platform failure isolation (e.g. Instagram missing media does not invalidate LinkedIn success).
- [x] **T025** [US5] Build Studio Step 5 Publish Flow modal with platform checkboxes, engine selector, and live receipts.

---

## Phase 8: User Story 6 (P1) — Attributable Memory Extraction & Living Memory

**Goal**: Once a campaign is published, approved claims and milestone metrics are extracted back into Living Brand Memory.

- [x] **T026** [US6] Implement `MemoryExtractor` in `backend/app/services/memory/` enforcing invariant I10 (consumes ONLY approved/published outcomes).
- [x] **T027** [US6] Expose `POST /api/v1/memory/extract-from-campaign` in `backend/app/api/memory.py`.
- [x] **T028** [US6] Build Living Brand Memory surface in `frontend/src/app/dashboard/memory/page.tsx` with knowledge nodes, claims registry, and interactive Graph View.

---

## Phase 9: User Story 7 (P0/P1) — Polish, IA & Emil Kowalski Motion

**Goal**: The entire application feels editorial, snappy, and Apple-grade with unified navigation and active press feedback.

- [x] **T029** [US7] Build Vision Board Landing Page in `frontend/src/app/page.tsx` with *"You build the product. We build the story."* headline.
- [x] **T030** [US7] Build `AppSidebar.tsx` with 4-item IA (`Studio`, `Memory`, `Campaigns`, `Settings`) and tenant footer.
- [x] **T031** [US7] Build Campaigns list page in `frontend/src/app/dashboard/campaigns/page.tsx` with channel pills and engagement metrics.
- [x] **T032** [US7] Build Settings page in `frontend/src/app/dashboard/settings/page.tsx` with OAuth connection matrix.

---

## Phase 10: Verification & Quality Gates

- [x] **T033** Run automated 7-layer CI test suite (`backend/test_social_publishing.py`).
- [x] **T034** Verify zero TypeScript or Next.js build errors (`npm run build`).
- [x] **T035** Generate comprehensive walkthrough report with verification evidence and visual artifacts.
