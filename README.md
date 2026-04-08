# Warrant

**OAuth was designed for apps. AI agents need warrants.**

Warrant is a demo-first authorization product for multi-agent systems. A human authorizes a root agent, the root agent delegates narrower child warrants, and every downstream action stays bounded, inspectable, and revocable.

## What Warrant Is

Warrant is a focused demo for the Auth0 Authorized to Act hackathon. It is not a generic assistant platform. It is a concrete argument, implemented as a product:

- agent authority should be delegated in constrained branches
- child agents should only receive narrower permissions
- revoking one branch should invalidate descendants immediately
- sensitive actions should require explicit approval

## Judge Quickstart (3 Minutes)

If you only have a few minutes, this is the fastest truthful evaluation path:

1. `npm ci && npm run dev`
2. Open `http://localhost:3000/demo`
3. Follow the scenario sequence strip and verify:
   - Planner delegates narrower Calendar + Comms warrants
   - Comms overreach is policy-denied
   - bounded send is approval-gated
   - Comms branch revocation blocks later sends while Calendar remains active
4. Inspect the graph and timeline to confirm lineage and state transitions are explicit.

## Why This Problem Matters

Flat app-style OAuth consent is designed for one application acting as one principal. Multi-agent systems break that model:

- one user approval can fan out into many autonomous sub-agents
- each sub-agent can have a different risk profile
- an app-level token alone does not explain who delegated what, and why

Warrant adds lineage-aware delegation and branch-level control so this fan-out remains legible and enforceable.

## What Auth0 Does Here

Auth0 for AI Agents and Token Vault handle identity and external provider delegation:

- user sign-in/session boundary (`/auth/login`, `/auth/logout`)
- Google connected-account flow through `/auth/connect`
- delegated Google token access path for Calendar and Gmail actions
- sensitive send execution-release boundary that stays separate from local policy checks

Auth0 is load-bearing in this architecture. Without it, external Gmail/Calendar execution is unavailable.

## What the Warrant Layer Adds

Warrant is the local authorization layer OAuth does not provide:

- root and child warrant issuance with explicit parent-child lineage
- narrowing rules so child warrants cannot exceed parent authority
- resource constraints (recipients, domains, windows, usage caps)
- branch revocation with descendant invalidation
- denial reasons and timeline-friendly audit records

Together, Auth0 and Warrant form two-layer enforcement: local policy must allow the action, and Auth0 must be able to release delegated provider access.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Vitest

## Setup, Environment, And Local Run

### Prerequisites

- Node.js `>=22`
- npm `>=10`

### Install

```bash
npm ci
```

### Environment

Create `.env.local` from `.env.example`.

Required for live Auth0-backed flow (the app still boots without them, but provider actions stay unavailable):

- `APP_BASE_URL` (absolute URL; required for production-safe Auth0 callback/logout behavior)
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET` (at least 32 chars; 64 hex chars recommended)

Recommended for Google through Auth0:

- `AUTH0_GOOGLE_CONNECTION_NAME` (defaults to `google-oauth2`)
- `AUTH0_TOKEN_VAULT_CONNECTION_ID`

Optional debug overrides:

- `WARRANT_GOOGLE_CONNECTION_STATE`
- `WARRANT_GOOGLE_CONNECTION_EMAIL`

Use overrides only for UI rehearsal. Real provider delegation should use Auth0 sign-in plus `/auth/connect`.

Required for runtime model adapter calls:

- `GOOGLE_API_KEY` (store in local ignored `.env.local` only)

Optional runtime model tuning (demo defaults are already low-variance):

- `WARRANT_RUNTIME_MODEL_PROVIDER_ID` (default `gemma-4-31b-it`)
- `WARRANT_RUNTIME_MODEL_TEMPERATURE` (default `0.1`)
- `WARRANT_RUNTIME_MODEL_TOP_P` (default `0.1`)
- `WARRANT_RUNTIME_MODEL_MAX_OUTPUT_TOKENS` (default `2048`)

Runtime startup guard:

- Use `assertRuntimeModelStartup()` from `src/agents/runtime/config.ts` to fail fast on missing/invalid model config.
- Structured runtime calls use schema validation with one repair retry, then return explicit structured failure if still invalid.

### Run Locally

```bash
npm run dev
```

Open:

- `http://localhost:3000` for Auth0/session and provider readiness surfaces
- `http://localhost:3000/demo` for the canonical multi-agent delegation demo

Production deploy handoff:

- `docs/deploy/vercel-auth0-production-handoff.md`

Quick validation before deeper checks:

```bash
npm run validate:quick
```

### Production Start (Clean Sequence)

Use a fresh production build before `next start`.

```bash
npm install
npm run build
npm run start -- --port 3100
```

Important: `next dev` and `next build` both write to `.next/`. If you ran `npm run dev`, rebuild before `npm run start` to avoid stale/mixed artifacts.

For a non-interactive proof check:

```bash
npm run build
npm run smoke:demo
```

### Validate

```bash
npm run validate
```

Validation scripts:

- `npm run validate:quick` -> lint + typecheck + tests
- `npm run validate:core` -> `validate:quick` + production build
- `npm run smoke:demo` -> starts the built app and checks `/` and `/demo` markers
- `npm run smoke:auth0-live` -> calls `/api/demo/live-preflight` and fails unless readiness is `ready`
- `npm run validate` -> `validate:core` + `smoke:demo`

Live preflight notes:

- `/api/demo/live-preflight` is demo-tools-gated (enabled in development, or set `WARRANT_ENABLE_DEMO_TOOLS=true`).
- `token-only` mode validates only the runtime/model lane and intentionally skips Auth0/Google provider prerequisites.
- `live` mode performs full Auth0 + Google delegated-access and provider readiness checks; Gmail draft readiness can create a live draft artifact in the demo account.
- `smoke:auth0-live` expects a running server. Optional env:
  - `LIVE_PREFLIGHT_BASE_URL` (default `http://127.0.0.1:3000`)
  - `LIVE_PREFLIGHT_MODE` (`token-only` or `live`, default `live`)
  - `LIVE_PREFLIGHT_COOKIE` (optional cookie header for session-bound checks outside a browser)

## Main Demo Scenario

Canonical user request:

`Prepare my investor update for tomorrow and coordinate follow-ups.`

Current stable flow:

1. User signs in with Auth0 and links Google through `/auth/connect`.
2. Planner receives a parent warrant.
3. Planner issues narrower Calendar and Comms child warrants.
4. Calendar read succeeds within its time window.
5. Comms drafts follow-ups for bounded recipients.
6. Comms overreach send is denied by Warrant policy.
7. Sensitive send path shows approval boundary.
8. User revokes Comms branch; descendants lose authority immediately.
9. Post-revoke send attempt is blocked while Calendar branch remains active.

Demo modes:

- Deterministic fixture mode (`/demo` presets): fastest and repeatable for recording.
- Live Auth0/Google readiness mode (`/demo` preflight card): checks real delegated provider path status.

## Architecture Overview

This repo uses explicit boundaries so reviewers can inspect responsibility clearly:

- `src/auth`: Auth0 session and environment gating.
- `src/connections`: connected-account state and provider readiness via Auth0.
- `src/actions`: Gmail/Calendar action envelopes and provider execution boundaries.
- `src/warrants`: warrant issuance, narrowing checks, authorization, and revocation.
- `src/approvals`: sensitive action approval state and transitions.
- `src/agents`: planner + child-agent deterministic orchestration.
- `src/graph`: delegation graph projection and UI.
- `src/audit`: timeline and lineage-aware event surfaces.
- `src/demo-fixtures`: deterministic rehearsal scenarios (`main`, `comms-revoked`).

Request path, simplified:

1. Auth0 proves identity and delegated provider path availability.
2. Warrant policy checks whether the action is authorized for this branch.
3. Approval gate (for sensitive actions) decides whether execution can proceed.
4. Provider action runs only if policy + approval + Auth0 provider path all pass.

## Demo Instructions

1. Start the app with `npm run dev` and open `http://localhost:3000/demo`.
2. Keep the preset at `Main scenario (pre-revoke)` and walk the sequence in order:
   - planner delegation
   - child actions
   - denied overreach
   - approval-required send
3. Inspect `Canonical Proof Points` to confirm denial and approval are separate outcomes.
4. Trigger Comms revocation (or switch to `Comms revoked (post-revoke)`).
5. Confirm post-revoke Comms send is blocked and Calendar remains active.
6. Use `Authorization Timeline` to confirm who acted, which warrant was used, and why each step was allowed/blocked.
7. Before recording, run live preflight in `/demo`:
   - start with `token-only`
   - then run `live` only when signed in and connected to Google via Auth0

For a scriptable sanity check of judge-visible markers:

```bash
npm run build
npm run smoke:demo
```

## Project Structure

- `src/app`: routes (`/`, `/demo`, `/api/demo/state`) and app shell
- `src/components`: Auth shell, demo surface, delegation graph UI
- `src/contracts`: shared domain contracts for auth, warrants, actions, approvals, graph, and demo records
- `src/auth`: Auth0 SDK boundary, session snapshots, env parsing
- `src/connections`: Google connection setup and token-vault-backed connection state
- `src/warrants`: issue/validate/authorize/revoke engine
- `src/agents`: deterministic planner and child-agent scenario orchestration
- `src/actions`: provider adapters and external action execution envelopes
- `src/approvals`: approval requirement and decision handling

## Submission And Narrative Assets

- `docs/execplan-final-polish-packaging.md`: ordered execution plan used for this final polish branch
- `docs/submission/devpost-project-description.md`: Devpost-ready project description
- `docs/submission/judging-checklist.md`: explicit framing against hackathon judging criteria
- `docs/submission/screenshot-captions.md`: screenshot capture guidance and proof-oriented captions
- `docs/blog/oauth-for-apps-ai-agents-need-warrants.md`: Auth0 community blog-prize draft
- `docs/demo/final-3-minute-script.md`: beat-by-beat demo script and recording fallback notes
- `docs/deploy/vercel-auth0-production-handoff.md`: Vercel deployment, Auth0 production setup, and post-deploy/demo preflight runbook
- `src/graph`: graph view models and rendering integration
- `src/audit`: lineage/timeline aggregation boundary
- `src/demo-fixtures`: canonical seeded scenarios and local rehearsal state
