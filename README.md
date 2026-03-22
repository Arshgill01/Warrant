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
- Calendar read and Gmail draft use thin wrappers that only become ready when Auth0 can supply delegated Google access.
- Gmail send stays pending behind an approval placeholder even when Auth0 and local policy are both ready.
- The shell keeps local Warrant policy distinct from Auth0-backed external capability so later branches can prove the two-layer model clearly.

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

Auth-shell validation commands:

```bash
npm run lint
npm run test
npm run typecheck
npm run build
```
