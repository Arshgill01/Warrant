# Local Live Verification Notes

Date: 2026-04-07

## Scope covered

- Local startup and validation commands
- Live readiness preflight checks (`token-only`, `live`)
- UI walkthrough of `/` and `/demo` (including preset switch and revocation proof)
- Scenario/runtime/control-state assertions from code-level scenario execution
- Live model probe command (`npm run verify:live-model`)

## Verified in this environment

- App boots in dev and production-start smoke paths.
- `/` and `/demo` render expected surfaces and proof cards.
- Graph/timeline/rehearsal controls remain coherent.
- Overreach denial, approval-required send, and post-revoke block are present in scenario state and UI.
- Runtime model mapping is configured as logical `gemma-4-31b` -> provider `gemma-4-31b-it`.
- Live readiness surfaces truthfully report blocked prerequisites.

## Not fully verified in this environment

- Full successful live Gemma inference call was not proven because `GOOGLE_API_KEY` is missing in `.env.local`.
- Full live Auth0 session + Google connected-account execution path was not proven because no active local Auth0 session/connected state was present during this pass.

## Blocking preflight findings

- `runtime_model_readiness`: blocked (`GOOGLE_API_KEY` missing)
- in `live` mode: `auth0_session_readiness`, `connected_account_bootstrap`, and `delegated_google_access` remain blocked when signed out
- provider checks (`calendar_provider_readiness`, `gmail_draft_readiness`, `gmail_send_readiness`) remain blocked until delegated Google access is ready

## Recommended next local action

1. Add `GOOGLE_API_KEY` to local ignored `.env.local`.
2. Sign in via Auth0 and complete Google connect flow.
3. Re-run:
   - `npm run verify:live-model`
   - `/demo` live preflight in both modes
4. Record only after preflight and live-model probe both show ready/success.
