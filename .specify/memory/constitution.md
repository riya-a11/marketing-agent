# Marketing OS Constitution

## Core Principles

### I. Ground Truth & Evidence Hierarchy (NON-NEGOTIABLE)
Every campaign generated must be strictly anchored in the company's verified memory and facts.
Evidence Hierarchy: **Verified Customer Proof > Company Facts > Marketing Strategy > Generic AI Copy**.
The system must never generate unverified superlatives without flagging them.

### II. Emil Kowalski Design Engineering
- Fast, purposeful micro-interactions with duration between 150ms and 250ms.
- Strong custom easing: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Never use `ease-in`.
- Physical button feedback with active press state: `button:active { transform: scale(0.98); }`.
- 1px crisp borders, subtle elevation, high-contrast typography (SF Pro / Inter), and generous whitespace.

### III. Single Update → Synchronized Multi-Channel Campaign
The atomic unit of work is a **Campaign**, not an isolated post.
A single product update generates synchronized, platform-native executions across **LinkedIn, X (Twitter), Instagram, and Short-Form Video Storyboards** derived from one strategic angle.

### IV. Multi-Tenant Isolation & Token Security
- Developer apps belong to Marketing OS; founders connect accounts via standard OAuth 2.0 PKCE.
- Social tokens are encrypted with `TOKEN_ENCRYPTION_KEY` using AES-GCM / SHA-256 before persistence and decrypted only in backend memory.
- Every publication and asset is strictly scoped to `organization_id`.

### V. Otto — The Contextual Marketing Advisor
- Otto is not a floating chatbot mascot; Otto is the in-flow marketing brain.
- Otto never interrupts without delivering actionable marketing judgment, reasons, and a 1-click fix.

## Governance
All code changes and features must uphold this constitution. Complexity must be hidden underneath the interface, preserving Apple-level simplicity for the founder.

**Version**: 1.0.0 | **Ratified**: 2026-08-20
