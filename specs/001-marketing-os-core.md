# Specification: Marketing OS Core Product & Studio Engine

**Status**: Approved  
**Version**: 1.0.0  
**Authors**: Marketing OS Engineering & Product Team  
**Framework**: GitHub Spec Kit (Spec-Driven Development)  

---

## 1. Executive Summary & Objective

Marketing OS is an intelligent marketing operating system for early-stage B2B / SaaS founders. It turns raw company milestones and product updates into sharp, synchronized, cross-channel campaigns grounded in company facts and verified customer evidence.

---

## 2. User Persona & Trigger Event

### Primary Persona
- **Role**: Early-stage SaaS solo founder / technical co-founder.
- **Team Size**: 1–15 employees (no dedicated marketing staff).
- **Core Pain**: Stares at a blank text box after shipping code, produces generic or inconsistent marketing, or forgets past customer proof.

### Trigger Event ("The Feature Ship Moment")
The founder merges a feature or accomplishes a key business milestone on Thursday evening and needs to broadcast high-converting, on-brand announcements to LinkedIn, X, and Instagram by Friday morning without manual drafting friction.

---

## 3. Functional Requirements Matrix

### R1. Update Ingestion ("What happened?")
- System presents a single, focused input interface asking: *"What did your company ship or achieve?"*
- Supports input up to 2000 characters with quick-inspiration templates.
- Triggers strategic analysis against the company's Brand Memory graph.

### R2. Strategic Narrative Discovery
- System discovers 3 distinct narrative angles:
  1. **Customer Outcome** (⭐ Recommended - anchored in customer transformation and verified proof metrics).
  2. **Founder Conviction** (Story-led narrative highlighting problem discovery and conviction).
  3. **Product / Benchmark Milestone** (Direct capability release).
- Evaluates evidence backing each angle and displays the *"Why?"* rationale.

### R3. Synchronized Multi-Channel Campaign Generation
- Derives all channel executions from **one unified strategic thesis**:
  - **LinkedIn**: Thought-leadership formatted post with context, outcome proof, and clear CTA.
  - **X (Twitter)**: Punchy 2-tweet hook / announcement within 280 characters.
  - **Instagram**: Bold visual headline graphic mockup + engaging caption.
  - **Short-Form Video**: 9:16 Video concept with hook line and 3-scene visual storyboard.

### R4. Otto — The Contextual Marketing Advisor
- In-flow marketing decision engine with 3D expressive character states (`idle`, `thinking`, `found_something`, `warning`, `success`).
- Delivers contextual critiques (e.g. *"Don't lead with the feature. Your customer buys back 2.5 days. Lead with that."*) with 1-click apply buttons (`[Rewrite with this angle →]`).

### R5. Obsidian-Inspired Living Brand Memory
- Graph-structured knowledge surface containing:
  - **Knowledge Nodes**: Company positioning, product capabilities, ICP personas, and case studies.
  - **Claims Registry**: Categorized claims (`Verified ✓`, `Unsupported ⚠`, `Prohibited ✗`).
  - **Negative Constraints**: Forbidden phrases, compliance rules, and legal limitations.
  - **Relationship Links**: Explicit links between customer proof $\longleftrightarrow$ products $\longleftrightarrow$ campaigns.

### R6. Multi-Tenant OAuth 2.0 & Dual-Mode Distribution
- Developer applications owned once by Marketing OS.
- Founders authorize platform access via backend-only OAuth 2.0 PKCE.
- Access and refresh tokens encrypted with `TOKEN_ENCRYPTION_KEY` using AES-GCM / SHA-256 before database storage.
- Dual Publishing Modes:
  1. **Direct Native API**: LinkedIn Posts API (`/rest/posts`), X API v2 (`/2/tweets`), Instagram Container Graph API.
  2. **n8n Webhook Engine**: Normalized webhook dispatch payload for custom workflow automation.

### R7. Emil Kowalski Design Engineering & Micro-Interactions
- **Color Palette**: Violet `#7C5CFF`, Ink `#080B0D`, Graphite `#151518`, 1px borders `#232328`.
- **Motion & Transitions**:
  - Fast durations: 150ms–200ms.
  - Custom curve: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
  - Active button states: `button:active { transform: scale(0.98); }`.
  - Zero sluggish `ease-in` animations.

---

## 4. Verification & Quality Gates

1. **Automated CI Suite (Simulated Provider Mode)**:
   - Binary magic-byte format validation for media uploads.
   - Idempotency key protection preventing duplicate posts.
   - Failure-isolated concurrent publishing across platforms.
   - Automated contract test suite running with 100% pass rate.
2. **Live Staging Verification**:
   - Verification of live OAuth tokens and external permalink resolution upon adding developer credentials.
