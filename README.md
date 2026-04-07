# Warrant

**OAuth was designed for apps. AI agents need warrants.**

Warrant is a demo-first authorization product for multi-agent systems. A human authorizes a root agent, the root agent delegates narrower child warrants, and every downstream action stays bounded, inspectable, and revocable.

## What Warrant Is

Warrant is a focused demo for the Auth0 Authorized to Act hackathon. It is not a generic assistant platform. It is a concrete argument, implemented as a product:

- agent authority should be delegated in constrained branches
- child agents should only receive narrower permissions
- revoking one branch should invalidate descendants immediately
- sensitive actions should require explicit approval

## Why This Problem Matters

Flat app-style OAuth consent is designed for one application acting as one principal. Multi-agent systems break that model:

- one user approval can fan out into many autonomous sub-agents
- each sub-agent can have a different risk profile
- an app-level token alone does not explain who delegated what, and why

Warrant adds lineage-aware delegation and branch-level control so this is legible and enforceable.

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

- `APP_BASE_URL` (or `NEXT_PUBLIC_APP_URL`)
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
- `token-only` mode validates Auth0 delegated-token readiness without live provider writes.
- `live` mode performs real provider checks; Gmail draft readiness can create a live draft artifact in the demo account.
- `smoke:auth0-live` expects a running server. Optional env:
  - `LIVE_PREFLIGHT_BASE_URL` (default `http://127.0.0.1:3000`)
  - `LIVE_PREFLIGHT_MODE` (`token-only` or `live`, default `live`)
  - `LIVE_PREFLIGHT_COOKIE` (optional cookie header for session-bound checks outside a browser)

## Main Demo Scenario

Canonical user request:

`Prepare my investor update for tomorrow and coordinate follow-ups.`

Current stable flow after Wave 4 hardening:

1. User signs in with Auth0 and links Google through `/auth/connect`.
2. Planner receives a parent warrant.
3. Planner issues narrower Calendar and Comms child warrants.
4. Calendar read succeeds within its time window.
5. Comms drafts follow-ups for bounded recipients.
6. Comms overreach send is denied by Warrant policy.
7. Sensitive send path shows approval boundary.
8. User revokes Comms branch; descendants lose authority immediately.
9. Post-revoke send attempt is blocked while Calendar branch remains active.

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

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000/demo`.
3. Confirm the scenario prompt is visible.
4. Inspect the delegation graph and timeline for issue, deny, approval, and revoke states.
5. Use rehearsal controls to switch to `Main scenario (pre-revoke)`.
6. Use rehearsal controls to switch to `Comms revoked (post-revoke)`.
7. From `main`, trigger Comms revocation and verify later Comms send is blocked.
8. Verify Calendar branch remains active after Comms revoke.
9. Run the live readiness preflight card in `/demo` before recording:
   - start with `token-only`
   - run `live` when signed in and connected to Google through Auth0

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
- `src/graph`: graph view models and rendering integration
- `src/audit`: lineage/timeline aggregation boundary
- `src/demo-fixtures`: canonical seeded scenarios and local rehearsal state
