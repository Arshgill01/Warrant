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

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to a local env file and replace the placeholder values before wiring Auth0, OpenAI, or database integrations.

Required for the auth shell:

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`
- `APP_BASE_URL`

Recommended for Google delegated access:

- `AUTH0_GOOGLE_CONNECTION_NAME`
- `AUTH0_TOKEN_VAULT_CONNECTION_ID`

Optional shell-only overrides:

- `WARRANT_GOOGLE_CONNECTION_STATE`
- `WARRANT_GOOGLE_CONNECTION_EMAIL`

Use the shell overrides only to rehearse UI states while the real Auth0 connected-account callback is still being wired. The real path should use Auth0 sign-in plus `/auth/connect`.

## Auth0 shell behavior

- `/auth/login` and `/auth/logout` come from the Auth0 Next.js SDK middleware.
- The home page shows three layers separately: app session, Google provider connection, and external action readiness.
- Calendar read and Gmail draft use thin wrappers that only become ready when Auth0 can supply delegated Google access.
- Gmail send stays pending behind an approval placeholder even when Auth0 and local policy are both ready.

To connect Google through Auth0, the shell uses the SDK connect-account route at `/auth/connect` with the Google Calendar read and Gmail compose or send scopes.

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
