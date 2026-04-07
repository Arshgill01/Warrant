# Warrant Vercel + Auth0 Production Handoff

This handoff is for the `deploy-handoff-complete` track only.

Scope:

- deployment-safe environment setup
- Auth0 production configuration after Vercel gives the final URL
- concrete verification and demo-preflight runbook

## 1. Environment variables (Vercel)

Set these in Vercel for the Production environment before your first production deploy.

### Required

| Variable | Required in Vercel | Server-only | Used by |
| --- | --- | --- | --- |
| `APP_BASE_URL` | Yes | No (base URL only) | Auth0 client URL/callback/logout construction |
| `AUTH0_DOMAIN` | Yes | Yes | Auth0 SDK tenant domain |
| `AUTH0_CLIENT_ID` | Yes | Yes | Auth0 SDK client wiring |
| `AUTH0_CLIENT_SECRET` | Yes | Yes | Auth0 SDK confidential client secret |
| `AUTH0_SECRET` | Yes | Yes | Session/transaction cookie encryption |
| `GOOGLE_API_KEY` | Yes (for live runtime/preflight) | Yes | Runtime model + live preflight runtime check |

### Optional but recommended

| Variable | Why |
| --- | --- |
| `AUTH0_GOOGLE_CONNECTION_NAME` | Override connected-account connection name (default is `google-oauth2`). |
| `AUTH0_TOKEN_VAULT_CONNECTION_ID` | Displays Token Vault connection id in the setup/readiness surface. |
| `AUTH0_AUDIENCE` | Needed only if your Auth0 tenant/app requires an API audience on login. |

### Optional local/debug-only (do not set in production unless intentionally testing)

| Variable | Effect |
| --- | --- |
| `WARRANT_GOOGLE_CONNECTION_STATE` | Forces shell connection state override. |
| `WARRANT_GOOGLE_CONNECTION_EMAIL` | Forces displayed connected-account label. |
| `WARRANT_ENABLE_DEMO_TOOLS` | Enables rehearsal-only demo reset routes in non-development envs. |
| `WARRANT_DEMO_STATE_FILE` | Overrides local demo-state storage path. |

Notes:

- Do not add secrets under any `NEXT_PUBLIC_*` variable.
- `APP_BASE_URL` must be an absolute `http(s)` URL.
- This repo intentionally requires `APP_BASE_URL` for production-safe Auth0 behavior.

## 2. Vercel deploy flow

1. Import the repo into Vercel.
2. Set all required variables above in Project Settings -> Environment Variables (Production).
3. Deploy.
4. Capture the production URL from Vercel (for example `https://warrant-demo.vercel.app`).
5. Use that exact URL in the Auth0 application settings checklist below.

Runtime routes this deployment must support:

- `/` (Auth0 access shell)
- `/demo` (delegation graph + timeline + proof points)
- `/auth/login`
- `/auth/logout`
- `/auth/callback`
- `/auth/connect`
- `/api/demo/live-preflight` (demo-tools-gated)

## 3. Auth0 production setup checklist

Use the same URL origin as `APP_BASE_URL`.

### Auth0 Application (Regular Web Application)

1. Confirm the Auth0 app type is `Regular Web Application`.
2. Set **Allowed Callback URLs** to include:
   - `https://<your-production-domain>/auth/callback`
3. Set **Allowed Logout URLs** to include:
   - `https://<your-production-domain>`
4. Set **Allowed Web Origins** to include:
   - `https://<your-production-domain>`

If you use preview domains, add each preview URL to the same Auth0 allow lists or preview login/connect flows will fail.

### Connected account / Google requirements

1. Confirm the Google connection exists and matches `AUTH0_GOOGLE_CONNECTION_NAME` (`google-oauth2` unless overridden).
2. In Auth0 connected-account configuration, ensure offline access / refresh-token capability is enabled for the Google connection.
3. Confirm delegated scopes required by Warrant are allowed:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.send`
4. If you use a fixed Token Vault connection id, set `AUTH0_TOKEN_VAULT_CONNECTION_ID` in Vercel to the matching value.

Expected in-app behavior when correct:

- `/` shows sign-in and Google connection readiness without setup blockers.
- `/auth/connect` can complete and return to app flow.
- Google connection state becomes `connected` with delegated token availability.
