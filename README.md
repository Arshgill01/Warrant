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
- approval system integration for sensitive external execution release

Auth0 is load-bearing in this architecture. Without it, external Gmail/Calendar execution is unavailable.

## What The Warrant Layer Adds

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

Required for Auth0-backed flow:

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

### Run Locally

```bash
npm run dev
```

Open:

- `http://localhost:3000` for Auth0/session and provider readiness surfaces
- `http://localhost:3000/demo` for the canonical multi-agent delegation demo

### Validate

```bash
npm run validate
```

Validation scripts:

- `npm run validate:quick` -> lint + typecheck + tests
- `npm run validate:core` -> `validate:quick` + production build
- `npm run smoke:demo` -> starts the built app and checks `/` and `/demo` markers
- `npm run validate` -> `validate:core` + `smoke:demo`

## Directory guide

- `src/app`: App Router entrypoints and page shell
- `src/components`: Shared UI used by the scaffold
- `src/contracts`: Cross-worktree types and coordination contracts
- `src/auth`: Auth and session boundary
- `src/connections`: External provider connection boundary
- `src/warrants`: Warrant issuance and validation boundary
- `src/agents`: Planner and child-agent orchestration boundary
- `src/approvals`: Sensitive-action approval boundary
- `src/actions`: Executable action boundary and capability checks
- `src/graph`: Delegation tree UI boundary
- `src/audit`: Lineage, receipts, and event log boundary
- `src/demo-fixtures`: Deterministic demo fixtures and shared placeholder data

## Canonical demo fixtures

The default deterministic scenario lives in `src/demo-fixtures` and is centered on:

`"Prepare my investor update for tomorrow and coordinate follow-ups."`

Shared consumers should prefer these exports:

- `createDefaultDemoScenario()` for a fresh canonical snapshot
- `loadDemoState()` and `resetDemoState()` for in-memory rehearsal state
- `loadDelegationNodes()` for graph-ready delegation data
- `loadTimelineEvents()` for human-readable timeline data
- `loadScenarioExamples()` for the seeded valid, blocked, approval-pending, and revoked examples

This layer is demo infrastructure only. It does not replace future Auth0 integration, warrant enforcement, or persistence.

## Intended worktree split

- Auth worktree: `src/auth`, `src/connections`
- Warrant engine worktree: `src/warrants`, `src/contracts/warrant.ts`, `src/contracts/action.ts`
- Agents worktree: `src/agents`, `src/actions`
- Approval worktree: `src/approvals`
- Graph UI worktree: `src/graph`
- Audit worktree: `src/audit`
- Demo stability worktree: `src/demo-fixtures`
- Shared coordination changes: `src/contracts`, `src/app`, `src/components`

## Validation

Use the same baseline locally and in CI:

```bash
npm ci
npm run validate
```

Validation commands:

- `npm run validate:quick` runs lint, typecheck, and tests.
- `npm run validate:core` runs `validate:quick` plus a production build.
- `npm run smoke:demo` starts the built app on a non-default port and checks `/` and `/demo` for canonical demo markers.
- `npm run validate` runs `validate:core` plus `smoke:demo`.

The GitHub Actions workflow at `.github/workflows/validate.yml` runs the same gate stages (`lint`, `typecheck`, `test`, `build`, `smoke:demo`) with explicit step boundaries so failures are easier to pinpoint during integration.
