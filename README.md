# Warrant

Warrant is a demo-first Auth0 for AI Agents hackathon project built around one thesis:

**OAuth was designed for apps. AI agents need warrants.**

This worktree now includes the Auth0-facing shell, the warrant engine, deterministic demo fixtures, the delegation graph, and the approval-gated Gmail send path used in the Wave 2 demo.

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

Copy `.env.example` to `.env.local` and replace the placeholder values before wiring Auth0, OpenAI, or database integrations.

Required now for the auth foundation:

- `APP_BASE_URL`
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`

Recommended now:

- `NEXT_PUBLIC_APP_URL`
- `AUTH0_GOOGLE_CONNECTION_NAME`

Optional later for downstream delegated-action branches:

- `AUTH0_AUDIENCE`
- `AUTH0_TOKEN_VAULT_CONNECTION_ID`

Optional shell-only overrides:

- `WARRANT_GOOGLE_CONNECTION_STATE`
- `WARRANT_GOOGLE_CONNECTION_EMAIL`

Use the shell overrides only to rehearse UI states while the real Auth0 connected-account path is still being finalized. The real path uses Auth0 sign-in plus `/auth/connect`.

Google OAuth client credentials do not belong in this app env for this branch. Configure the Google social connection inside the Auth0 dashboard and let the app consume Auth0-managed delegated access.

## Local Auth0 setup

1. Create an Auth0 application of type `Regular Web Application`.
2. Add `http://localhost:3000/auth/callback` to Allowed Callback URLs.
3. Add `http://localhost:3000` to Allowed Logout URLs.
4. Add `http://localhost:3000` to Allowed Web Origins.
5. Put the Auth0 app values into `.env.local`.
6. Enable the Google connection in Auth0 and make sure it can be used by this application.
7. If you want Google only for delegated Gmail and Calendar access, configure the Google social connection with Connected Accounts for Token Vault enabled. If you also want users to sign in with Google, enable Authentication as well.
8. In the Google connection, use your own Google OAuth client ID and client secret rather than Auth0 developer keys.
9. Toggle the Google connection on for this Auth0 application from the connection's Applications tab.
10. Configure Auth0 My Account API access for this application and authorize the Connected Accounts scopes.
11. Enable Multi-Resource Refresh Token for the application with the My Account API so the SDK can exchange the login refresh token for connected-account access later.
12. For Google connected accounts, enable `offline_access` in the connection if Auth0 prompts for it.

The shell assumes the Google connection name is `google-oauth2` unless overridden. The `/auth/connect` handoff requests:

- `openid`
- `profile`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/gmail.compose`
- `https://www.googleapis.com/auth/gmail.send`

It also requests `access_type=offline` and `prompt=consent` so later Gmail and Calendar branches can rely on delegated refreshable access through Auth0 rather than direct provider secrets.

Connected-account prerequisites come from Auth0's Token Vault docs: the Google connection must be enabled for the application, Connected Accounts for Token Vault must be turned on, `offline_access` may be required for Google, and the application needs My Account API plus MRRT configured so `/auth/connect` can obtain the necessary Connected Accounts scopes.

## Auth0 shell behavior

- `/auth/login` and `/auth/logout` come from the Auth0 Next.js SDK middleware.
- `/auth/connect` uses the SDK connected-account endpoint and the configured Google connection name.
- The home page shows four layers separately: app session, Google provider connection, Token Vault readiness inputs, and external action readiness.
- Calendar availability, Gmail draft preparation, and send-email execution now flow through explicit provider-backed result envelopes.
- Gmail draft and Gmail send stay distinct: draft can succeed without implying send is allowed to execute.
- Gmail send remains a separate execution boundary that requires an explicit upstream release before it will hit the live provider path.
- The shell keeps local Warrant policy distinct from Auth0-backed external capability so later branches can prove the two-layer model clearly.
- The demo route now models the sensitive send approval ladder explicitly: `not-requested`, `pending`, `approved`, `denied`, `unavailable`, and `error`.
- Auth0 is intentionally visible in that flow: local Warrant eligibility and Auth0-backed approval are shown as separate gates before final Gmail execution becomes ready.

## What works now vs later

Working in this branch:

- official Auth0 Next.js SDK wiring
- middleware-based auth route handling
- signed-out, signed-in, and missing-config shell states
- visible Google disconnected, connected, pending, and unavailable states
- visible Token Vault-ready connection contract for later Gmail and Calendar work

Still requires external Auth0 dashboard configuration:

- real sign-in against your tenant
- real Google account connection through Auth0
- real connected-account or Token Vault-backed token exchange for the Google connection
- any actual Gmail or Calendar API calls

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
- `loadDemoState()` and `resetDemoState()` from `src/demo-fixtures/state` for server-side rehearsal state
- `createDelegationGraphView()` or `loadDelegationGraphView()` for graph-ready display data
- `createTimelineEventDisplayRecords()` or `loadTimelineEvents()` for timeline-ready display data
- `getDisplayScenarioExamples()` or `loadScenarioExamples()` for the seeded valid, blocked, approval-pending, and revoked examples

This layer is demo infrastructure only. It does not replace future Auth0 integration, warrant enforcement, or persistence.

The seeded scenario now includes:

- a successful Comms draft action
- a blocked Comms send overreach to an unapproved external recipient, denied by warrant policy before any provider send can execute
- a locally eligible Comms send attempt that stops in `approval-required`
- a pending Auth0 approval request with exact preview, recipients, and blast-radius copy

## Demo rehearsal tools

The merged demo route now supports a small rehearsal-only reset path backed by deterministic presets.

- In local `development`, `/demo` shows gated controls to restore the canonical approval-gate moment (`main`) or the post-revocation replay state (`comms-revoked`).
- Outside local development, the controls stay hidden unless `WARRANT_ENABLE_DEMO_TOOLS=true`.
- The current rehearsal state is stored in `WARRANT_DEMO_STATE_FILE` when set, or `/tmp/warrant-demo-state.json` by default.
- `POST /api/demo/state` accepts either JSON like `{"preset":"main"}` or a form post with `preset=main` / `preset=comms-revoked`.

If the stored demo state is stale, invalid, or half-written, Warrant automatically repairs it back to the canonical main scenario instead of failing the demo page.

## Shared display contracts

UI-facing graph, timeline, warrant-summary, action, and approval DTOs now live in `src/contracts/display.ts`.

Use adapters from `src/demo-fixtures/display.ts` to map canonical demo/domain data into those DTOs. Graph and demo surfaces should consume that adapter layer instead of raw warrant or fixture internals directly.

Graph consumers should prefer `GraphNodeDTO`, `GraphEdgeDTO`, and `DelegationGraphDTO` from `src/contracts`.

## Provider action contracts

Wave 2 provider-backed actions use explicit result envelopes from `src/contracts/action.ts`.

These envelopes answer:

- whether Auth0-backed Google access is reachable for the requested action
- what provider data came back on success
- what provider-specific failure or execution-blocked state occurred

They do not answer local Warrant authorization or approval-flow completion. Those concerns stay in separate layers.


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

- `npm run check:merge-conflicts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

The baseline is intentionally strict:

- `npm run check:merge-conflicts` fails on unresolved Git conflict markers in source, test, config, and docs files.
- `npm run lint` reports warnings as failures and also fails on unused ESLint disable directives.
- `npm run typecheck` generates Next route types and runs TypeScript with `noUnusedLocals` and `noUnusedParameters`.
- `npm run test` includes fixture, graph, auth-shell, and route-render smoke coverage for the seeded demo surfaces.

The GitHub Actions workflow at `.github/workflows/validate.yml` runs the same command so worktrees merge against one shared gate definition.
