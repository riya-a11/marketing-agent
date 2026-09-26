# Implementation Tasks: Marketing OS Core Product & Studio

**Parent Spec**: [001-marketing-os-core.md](./001-marketing-os-core.md)  
**Status**: Completed & Verified  

---

## Phase 1: Core Foundation & Constitution
- [x] **T1.1**: Initialize GitHub Spec Kit (`.specify/` and constitution)
- [x] **T1.2**: Define Core Constitution principles: Evidence hierarchy, Emil Kowalski design engineering, multi-tenant isolation.
- [x] **T1.3**: Configure global CSS variables (`--color-violet`, `--ease-out`, `--ease-in-out`).

---

## Phase 2: Otto Marketing Advisor & Visual Identity
- [x] **T2.1**: Implement interactive 3D robot face component ([`OttoAdvisor.tsx`](../frontend/src/components/OttoAdvisor.tsx)) with 5 mood states (`idle`, `thinking`, `found_something`, `warning`, `success`).
- [x] **T2.2**: Implement in-flow contextual advice banner with 1-click action triggers (`[Rewrite with this angle →]`).
- [x] **T2.3**: Implement AppSidebar navigation matching the Vision Board with tenant context footer (`Velo Dynamics / Riya Founder`).

---

## Phase 3: Hero Studio 5-Step Workflow
- [x] **T3.1**: Build Step 1: "What happened?" textarea with character limits and inline Otto card.
- [x] **T3.2**: Build Step 2: Strategic Angle Discovery (Customer Outcome ⭐ Recommended, Founder Story, Product Announcement) + Otto "Why?" breakdown.
- [x] **T3.3**: Build Step 3: Campaign Studio with multi-channel tabs (`LinkedIn`, `X`, `Instagram`), rich editor, inline improvement tips, and live feed preview graphics.
- [x] **T3.4**: Build Step 4 & 5: Claims Review & Publish Flow Modal with Direct Native API vs n8n Webhook selection and instant receipts.

---

## Phase 4: Living Brand Memory & Knowledge Graph
- [x] **T4.1**: Build Brand Memory surface ([`memory/page.tsx`](../frontend/src/app/dashboard/memory/page.tsx)) with structured knowledge nodes, claims registry, and negative constraints.
- [x] **T4.2**: Add interactive Graph View representation showing evidence links.
- [x] **T4.3**: Add knowledge ingestion modal for rapid evidence entry.

---

## Phase 5: Multi-Tenant OAuth & Publishing Subsystem
- [x] **T5.1**: Implement token encryption service ([`crypto.py`](../backend/app/services/security/crypto.py)) with AES-GCM / SHA-256 derivation.
- [x] **T5.2**: Implement signed OAuth state manager ([`state_manager.py`](../backend/app/services/oauth/state_manager.py)) with PKCE code verifier protection.
- [x] **T5.3**: Build multi-tenant database schema (`organizations`, `users`, `organization_members`, `social_accounts`, `social_publications`).
- [x] **T5.4**: Refactor platform publisher adapters (`LinkedInPosts`, `Xv2`, `InstagramContainer`) with idempotency keys and classified retry policies.

---

## Phase 6: Automated CI Test Suite & Verification
- [x] **T6.1**: Run 7-layer automated test suite (`backend/test_social_publishing.py`) verifying magic-byte binary validation, idempotency, batch polling, and failure isolation.
- [x] **T6.2**: Verify clean Next.js build (`frontend/`) with 0 TypeScript errors.
