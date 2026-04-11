# ExecPlan — Connect Start HTTP 400 Isolation (2026-04-11)

## Objective

Isolate the exact root cause behind `connect_failure_code=http_400` during `/api/connect/google` initiation by making local diagnostics surface Auth0 My Account API error details, and by correcting failure-state classification so non-bootstrap failures are not mislabeled as bootstrap token failures.

## Demo relevance

This directly protects demo beat #2 (user connects Google through Auth0). Judges need a truthful reason when connect fails before Google handoff, otherwise troubleshooting is guesswork and repeated demo rehearsal is blocked.

## Scope

In scope:

- `connect-start` route diagnostics and error parsing
- failure-state classification for connect initiation failures
- minimal tests that lock in classification behavior

Out of scope:

- non-auth product features
- runtime model activation
- broad UI redesign

## Files/modules expected to change

- `src/app/api/connect/google/route.ts`
- `src/connections/google-connect-flow.ts`
- `tests/google-connect-flow.test.ts`

## Invariants to preserve

- successful connect-start still redirects to Auth0/Google handoff as before
- no secrets or tokens are logged
- bootstrap token failures (`401` + connected-account access-token retrieval wording) remain classified as bootstrap failures
- diagnostics remain short and safe for query-string transport

## Implementation steps

1. Add an SDK-first path in `/api/connect/google` that uses `auth0.connectAccount(...)` when Auth0 is configured.
2. Capture `ConnectAccountError` details (`code`, `cause.type`, `cause.title`, `cause.detail`, `cause.validationErrors`) and convert to a concise diagnostic error detail.
3. Keep a fallback fetch-to-`/auth/connect` path for unconfigured scenarios to preserve existing behavior.
4. Update `classifyGoogleConnectStartFailure` to map initiation/config failures (including `failed_to_initiate`/`http_400`) to `tenant-config-issue` unless explicit callback/redirect signals are present.
5. Add tests for new classification rules.
6. Run validation (`lint`, `typecheck`, `test`, `build`).

## Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Manual verification target after patch:

- trigger `/api/connect/google` in fresh session
- verify `connect_failure_detail` includes concrete Auth0 initiation cause when `400` occurs
- verify lifecycle label reflects `tenant-config-issue` when connect initiation fails before Google handoff

## Risks

- SDK error payload fields may vary by tenant state; parser must tolerate missing fields.
- Longer diagnostic strings may be truncated by query-string sanitization (intentional for safety).
- Route-level behavior differs between configured and unconfigured Auth0 states; fallback path must remain intact.

