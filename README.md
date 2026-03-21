# Warrant

Warrant is a demo-first Auth0 for AI Agents hackathon project built around one thesis:

**OAuth was designed for apps. AI agents need warrants.**

This worktree implements the Auth0-facing shell for the foundation milestone. It makes sign-in, Google connection state, and delegated Gmail or Calendar access setup visible before the warrant engine and graph land.

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
- `createDelegationGraphView()` or `loadDelegationGraphView()` for graph-ready display data
- `createTimelineEventDisplayRecords()` or `loadTimelineEvents()` for timeline-ready display data
- `getDisplayScenarioExamples()` or `loadScenarioExamples()` for the seeded valid, blocked, approval-pending, and revoked examples

This layer is demo infrastructure only. It does not replace future Auth0 integration, warrant enforcement, or persistence.

## Shared display contracts

UI-facing graph, timeline, warrant-summary, action, and approval DTOs now live in `src/contracts/display.ts`.

Use adapters from `src/demo-fixtures/display.ts` to map canonical demo/domain data into those DTOs. Graph and demo surfaces should consume that adapter layer instead of raw warrant or fixture internals directly.

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

`npm run validate` runs the repo quality gates in this order:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

The GitHub Actions workflow at `.github/workflows/validate.yml` runs the same command so worktrees merge against one shared gate definition.
