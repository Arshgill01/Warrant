# ExecPlan — Auth0 Token Vault Browser Verification Loop (2026-04-11)

## Objective

Fully verify and unblock (or conclusively isolate) the local Auth0 Token Vault connected-account flow by repeatedly testing the live app and Auth0 dashboard with browser automation evidence, focused on the current `http_401` connect-start bootstrap failure edge.

## Demo relevance

This directly protects the core demo beat: user signs in, connects Google through Auth0, and reaches delegated provider readiness. Without this, the thesis proof path is not credible in a live run.

## Scope

In scope:

- local app verification for sign-in/connect/preflight diagnostics
- automated browser flow over local app and Auth0 dashboard
- explicit verification of client, My Account API, Connected Accounts, Token Vault, and Google connection settings
- narrow app-side fixes for state truthfulness, connect flow, or diagnostics if evidence shows ambiguity/bugs
- repeatable retest loop with fresh browser context and artifacts
- concrete final isolation if the remaining blocker is tenant-side or external

Out of scope:

- Gemma runtime activation or non-auth provider work
- broad architecture refactors unrelated to the connect blocker
- adding new integrations/providers

## Files/modules likely affected

- `docs/execplan-auth0-token-vault-browser-verification.md` (this plan)
- `output/playwright/` artifacts (screenshots/evidence)
- `scripts/` (possible browser verification harness if needed)
- `src/app/api/connect/google/route.ts` (only if connect-start diagnostics need tightening)
- `src/connections/google.ts` (only if state classification/truthfulness is incorrect)
- `src/demo-fixtures/live-preflight.ts` (only if diagnostics specificity requires a minimal fix)
- `src/components/auth-shell/auth-shell.tsx` (only if evidence rendering is ambiguous)
- related tests under `tests/` for any behavior change

## Invariants to preserve

- two-layer enforcement stays explicit: local Warrant policy + Auth0 delegated access
- child authority narrowing/revocation semantics unchanged
- no false “connected” state without delegated token evidence
- no secret/token leakage in source, docs, logs, or commits
- only minimal reversible dashboard-side changes

## Ordered implementation steps

1. Baseline local environment + code identity checks:
   - verify local startup behavior and inspectable runtime client config
   - verify branch/code is current for this track
2. Reproduce current failure from a fresh browser context:
   - sign in (pause for manual login/MFA if required)
   - run `/demo` preflight in `live` mode
   - trigger `Connect Google with Auth0`
   - capture redirects/network/errors/screenshots
3. Verify Auth0 dashboard configuration against exact local client id:
   - app identity/type and Token Vault grant state
   - My Account API activation + app access/scopes
   - Google connection purpose/offline access/app enablement/client configuration
   - refresh-token exchange assumptions and rotation setting based on actual path
4. Build concrete hypothesis from combined app + dashboard evidence.
5. Apply the smallest fix:
   - app-side first when ambiguity/incorrectness is in code
   - dashboard-side only when clearly required and reversible
6. Retest from a fresh browser context:
   - repeat sign-in/connect/preflight and confirm whether handoff progresses
   - capture post-fix evidence
7. Loop steps 3–6 until:
   - real Google/Auth0 handoff path progresses correctly, or
   - exact remaining blocker is isolated with hard evidence and no app-side ambiguity.
8. Validate code changes (if any), then produce clean incremental commits by slice.

## Validation plan

Local commands:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke:auth0-live` (with local app running and relevant mode)

Browser-driven checks (repeated):

- fresh/incognito context each retest
- `/` sign-in state + diagnostics truthfulness
- `/demo` live preflight diagnostics
- connect flow redirect/callback/network evidence
- Auth0 dashboard settings verified against local client id
- artifact capture in `output/playwright/`

## Risks

- manual login/MFA/consent pauses may gate full automation continuity
- tenant dashboard permissions may restrict direct verification or edits
- stale browser/session state can hide true failure edges (mitigated by fresh contexts)
- missing local secret env can block full live path in this workspace

## Acceptance criteria

- exact Auth0 app/client used by local app is verified from evidence
- My Account API / Connected Accounts / Token Vault settings are explicitly verified
- connect flow is retested repeatedly against verified tenant state
- blocker is either fixed or isolated with concrete evidence and clear ownership
- final state is reliable enough to proceed to the next live-flow step
