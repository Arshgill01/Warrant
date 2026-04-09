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

## 4. Ordered post-deploy verification checklist

Run this sequence in order after production deploy and Auth0 URL updates.

1. App boot:
   - Open `https://<your-production-domain>/`.
   - Confirm the page loads and renders `Auth0 Access Shell`.
2. Login:
   - Click `Continue with Auth0` or open `/auth/login`.
   - Confirm Auth0 login completes and returns to `/`.
3. Callback/session persistence:
   - Confirm post-login state shows signed-in identity details.
   - Refresh `/` and verify session remains signed in.
4. Logout:
   - Click `Log out` or open `/auth/logout`.
   - Confirm return to signed-out shell state on `/`.
5. Provider-connected state:
   - While signed in, use `Connect Google with Auth0`.
   - Confirm return to app and Google state becomes `connected` (not pending/unavailable).
6. Planner/runtime invocation:
   - Open `/demo`.
   - Confirm canonical scenario content renders (`Prepare my investor update for tomorrow and coordinate follow-ups.`).
7. Draft flow:
   - Verify Comms draft path is represented as successful draft capability in the scenario proof/timeline.
8. Denied overreach:
   - Verify the overreach attempt is shown as policy-denied with `recipient_not_allowed`.
9. Approval-required flow:
   - Verify bounded send remains approval-gated (approval required/pending state is visible before execution).
10. Revoke flow:
    - Switch to or trigger revoked branch state and verify Comms post-revoke action is blocked.
11. Graph/timeline coherence:
    - Confirm graph node states and authorization timeline tell the same story (delegation, deny, approval, revoke) without contradictions.

If any step fails, use troubleshooting below before recording.

## 5. Troubleshooting (production-focused)

### `/auth/login` or `/auth/connect` returns `503` JSON

Cause:

- server auth env is incomplete

Fix:

1. verify required env vars exist in Vercel Production:
   - `APP_BASE_URL`
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_SECRET`
2. redeploy after env fix

### Login fails with callback/logout mismatch errors

Cause:

- Auth0 Allowed Callback/Logout/Web Origin values do not match deployed URL

Fix:

1. set Callback URL to `https://<domain>/auth/callback`
2. set Logout URL to `https://<domain>`
3. set Web Origin to `https://<domain>`
4. retry login

### Signed in, but Google stays `not-connected` or `unavailable`

Cause:

- connected-account flow not completed, wrong connection name, or tenant/provider setup mismatch

Fix:

1. verify `AUTH0_GOOGLE_CONNECTION_NAME` matches your Auth0 Google connection
2. run `/auth/connect` again from a signed-in session
3. verify Google connection has offline-access/refresh-token capability enabled

### `/api/demo/live-preflight` returns 404

Cause:

- demo tools are disabled in production by default

Fix:

1. set `WARRANT_ENABLE_DEMO_TOOLS=true` in Vercel
2. redeploy and re-run preflight
3. remove/reset after rehearsal if you do not want demo tooling enabled

### Live preflight blocked by runtime model config

Cause:

- missing or invalid runtime model env values (often `GOOGLE_API_KEY`)

Fix:

1. verify `GOOGLE_API_KEY` is set in Vercel
2. verify optional runtime overrides are numeric and in range:
   - `WARRANT_RUNTIME_MODEL_TEMPERATURE` between `0` and `1`
   - `WARRANT_RUNTIME_MODEL_TOP_P` greater than `0` and at most `1`
   - `WARRANT_RUNTIME_MODEL_MAX_OUTPUT_TOKENS` positive integer

### Graph and timeline appear out of sync during verification

Cause:

- stale browser state or stale local rehearsal data when switching between preset/revoked states

Fix:

1. hard refresh `/demo`
2. use rehearsal preset restore controls when enabled
3. re-run the ordered verification sequence from step 6 onward

## 6. After Vercel gives you the production URL, do this next

1. Set `APP_BASE_URL` in Vercel to the exact production origin (for example `https://warrant-demo.vercel.app`).
2. In Auth0 Application settings, update:
   - Allowed Callback URLs: `https://<domain>/auth/callback`
   - Allowed Logout URLs: `https://<domain>`
   - Allowed Web Origins: `https://<domain>`
3. Redeploy once env/Auth0 values are in sync.
4. Run the ordered post-deploy verification checklist.
5. If recording soon, enable demo tools temporarily (`WARRANT_ENABLE_DEMO_TOOLS=true`) and redeploy.

## 7. Demo preflight checklist (recording readiness)

Use this checklist immediately before recording the 3-minute demo.

1. Baseline deploy sanity:
   - open `/` and `/demo`
   - confirm no setup blocker messaging
2. Auth/session sanity:
   - sign in through `/auth/login`
   - ensure logout and re-login both work
3. Google connection sanity:
   - run `/auth/connect` and confirm `connected` state in shell
4. Deterministic demo-state sanity:
   - in `/demo`, restore `Main scenario (pre-revoke)` preset (if tools enabled)
   - confirm overreach denied + approval-required + revoke outcomes are visible
5. Live readiness preflight:
   - run `/api/demo/live-preflight?mode=token-only` (runtime/model lane only)
   - then run `/api/demo/live-preflight?mode=live` (full Auth0 + Google delegated/provider path)
6. CLI smoke checks (optional but recommended):
   - `npm run build`
   - `npm run smoke:demo`
   - `LIVE_PREFLIGHT_BASE_URL=https://<domain> LIVE_PREFLIGHT_MODE=token-only npm run smoke:auth0-live`
7. Recording pass/fail gate:
   - proceed only if login/connect/provider path and deny/approval/revoke proof points are all stable in one continuous run

If any check fails, resolve it before recording to avoid demo drift mid-take.
