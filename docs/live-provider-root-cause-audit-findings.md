# Live Provider Root-Cause Audit Findings

Date: 2026-04-08  
Track: `feat/live-provider-root-cause-audit`

## Clear diagnosis

### Exact failure edge for the observed message

The `"Failed to retrieve a connected account access token."` error is emitted by the Auth0 Next.js SDK `/auth/connect` handler **before** the Google connected-account redirect starts.

Code path (Auth0 SDK internals inspected locally):

1. `handleConnectAccount(req)` in `@auth0/nextjs-auth0/dist/server/auth-client.js`
2. SDK tries `getTokenSet(session, { scope: "create:me:connected_accounts", audience: "${issuer}/me/" })`
3. If `getTokenSet` fails, SDK returns `401` with:
   - `"Failed to retrieve a connected account access token."`
4. Only after this succeeds does SDK call `connectAccount(...)` to initiate the actual connected-account flow.

Implication: when this message appears, the connect flow is blocked at the SDK token bootstrap step, not at Google consent UI.

### Tenant/setup vs code classification

- Likely **tenant/setup blocker**:
  - missing/invalid refresh-token path for the signed-in Auth0 session (or stale session without refresh token)
  - session cannot satisfy `/me/` + `create:me:connected_accounts` token retrieval requirements
  - possible policy mismatch for refresh token usage across requested audience/scope
- Likely **code blocker (UX/diagnostic clarity)**:
  - account label could appear from session email fallback, which can look like “connected” while delegated token exchange is still failing
  - preflight previously lacked direct token-exchange cause visibility

Conclusion: root cause is likely **both**, with a primary tenant/session token setup issue and secondary code-level ambiguity that hid the exact edge.

## What changed in this branch

1. Added structured diagnostics for:
   - Auth0 session snapshot (`has_refresh_token`, config state, environment issues)
   - Google connection evaluation (connect href, account label source, token-exchange outcome)
   - token exchange failures (Auth0 error code + OAuth cause when available)
   - preflight check-level diagnostics lines
2. Added machine-readable server logs (`[live-provider] ...`) for:
   - session evaluation
   - connection evaluation
   - token exchange attempts/success/failure
   - preflight start/completion
3. Surfaced diagnostics in:
   - `/demo` live preflight cards
   - `/` auth shell connection/session sections
   - `scripts/smoke-auth0-live.mjs` output

## Local evidence captured

From local `/api/demo/live-preflight?mode=live` run, diagnostics now clearly show why checks are blocked (example in this environment):

- `auth0_configured=false`
- `has_session=false`
- `has_refresh_token=unknown`
- `google_connection_evaluation=skipped_no_signed_in_session`

In an Auth0-signed-in environment, the same diagnostics now expose:

- whether a refresh token exists on session
- whether token exchange was attempted
- exact Auth0/OAuth failure codes for the exchange

## Follow-up fix checklist for next branches

1. Tenant/session setup verification:
   - confirm login session includes refresh token (`offline_access` actually granted)
   - if user logged in before refresh-token settings changed, force full logout/login
   - verify Auth0 app/token policy permits the `/me/` + `create:me:connected_accounts` path used by `/auth/connect`
2. Connected-account readiness semantics:
   - stop treating session-email fallback as connection proof in UI
   - only show “connected account” identity when sourced from verified connected-account/token state
3. Connect flow clarity:
   - introduce a small wrapper route around `/auth/connect` to capture and display structured SDK failure code instead of generic 401 text
4. Preflight efficiency:
   - avoid repeated token exchange calls in one preflight pass by reusing one resolved delegated token where possible
5. Demo rehearsal gate:
   - require `google_connection` diagnostics to show `token_exchange_outcome=success` before calling live provider path “ready”
