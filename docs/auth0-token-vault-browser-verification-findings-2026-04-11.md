# Auth0 Token Vault Browser Verification Findings (2026-04-11)

Track: `auth0-token-vault-browser-verification`
Tenant inspected: `dev-ya5ej5h047brs7f7` (US)

## Objective status

Tenant-side Token Vault / Connected Accounts configuration was verified directly in Auth0 Dashboard with browser automation, and one concrete blocker was fixed.

Local app flow remains blocked in this workspace by missing local Auth0 environment variables, so the app cannot yet reach Auth0 login/connect handoff from `http://localhost:3000`.

## Local app evidence (before and after tenant fix)

Observed repeatedly from `/` and `/demo`:

- `connect_failure_code=http_503`
- `connect_failure_detail=Auth0 routes are unavailable because server auth configuration is incomplete.`
- `connected_account_evidence=none`
- `bootstrap_attempted=false`
- `token_exchange_attempted=false`
- `token_exchange_outcome=not-attempted`
- preflight `auth0_session_readiness` blocked with missing:
  - `AUTH0_DOMAIN`
  - `AUTH0_CLIENT_ID`
  - `AUTH0_CLIENT_SECRET`
  - `AUTH0_SECRET`
  - `APP_BASE_URL`

Conclusion for local state in this workspace:

- current failure edge is not `http_401`; it is earlier `http_503` due to missing local auth env
- this prevents reaching the Auth0/Google handoff path from local app

## Auth0 dashboard verification

### A) Exact application / client

- Application reviewed: `My App`
- Type: `Regular Web Application`
- Ownership: `First-party`
- Client ID: `IIdnRZRgxoRFWQMO04IdnN9G1AIsd8fb`
- Advanced Settings -> Grant Types:
  - `Token Vault` is enabled (checked)

### B) My Account API / Connected Accounts

Before fix:

- For `My App` -> `APIs` tab -> `Auth0 My Account API`:
  - User Access: `Unauthorized`
  - Client Access: `Denied`

Action taken (minimum reversible change):

- Edited `Auth0 My Account API` user access grant
- Changed authorization to `Authorized - Pick and choose permissions`
- Applied all available connected-account permissions:
  - `create:me:connected_accounts`
  - `read:me:connected_accounts`
  - `delete:me:connected_accounts`
- Saved grant successfully (`Client Grant successfully created`)

After fix:

- User Access: `Authorized`
- Client Access: still `Denied` (unchanged)

### C) Google connection (`google-oauth2`)

- Connection exists and is active
- Identifier: `con_rkQ5A9blEJf4t7QQ`
- Purpose is set to:
  - `Authentication and Connected Accounts for Token Vault` (selected)
- Offline access is enabled:
  - `Permissions -> Access Type -> Offline Access` is checked
- Application enablement:
  - `My App` is enabled for this connection (checked)
- Google OAuth client is configured (non-empty client id and secret configured in dashboard)

### D) Refresh-token assumptions

App-side path (from local implementation and diagnostics) expects the Token Vault connected-account bootstrap/token-exchange path that depends on refresh-token availability.

For `My App` settings:

- `Refresh Token Rotation` is currently disabled (`Allow Refresh Token Rotation` unchecked)
- This is compatible with the expected connected-account refresh-token exchange path.

## What changed in this run

Tenant-side change only:

- Authorized `Auth0 My Account API` for `My App` with connected-account permissions.

Repo changes:

- Added execution plan:
  - `docs/execplan-auth0-token-vault-browser-verification.md`
- Added this findings note:
  - `docs/auth0-token-vault-browser-verification-findings-2026-04-11.md`

## Remaining blocker classification

Primary remaining blocker for local flow in this workspace:

- `app-side local configuration` (missing `.env.local` Auth0/server values)

Secondary blocker that was fixed:

- `tenant-side` My Account API authorization for the app

## Next run conditions to reach real handoff

To continue from local `http_503` to true Auth0/Google handoff verification, local runtime must supply:

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID` (should match `IIdnRZRgxoRFWQMO04IdnN9G1AIsd8fb` if using `My App`)
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`
- `APP_BASE_URL` (e.g., `http://localhost:3000`)

Then rerun:

1. fresh browser state
2. `/` sign in via Auth0
3. `/demo` preflight live mode
4. `Connect Google with Auth0`
5. verify whether failure moves from bootstrap/config edge to handoff/consent/callback/token-exchange edge
