# Local Demo Runbook (Live Verification)

This runbook is for a local verification pass of Warrant before recording.

## 1. Prerequisites

- Node.js `>=22`
- npm `>=10`
- Auth0 app configured for this repo
- Google account available for Auth0 connected-account flow
- Local env file: `.env.local` (ignored by git)

Required env keys in `.env.local` (do not paste secrets into docs or commits):

- `APP_BASE_URL`
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`
- `GOOGLE_API_KEY` (required for live Gemma runtime probe)

Recommended for full provider path:

- `AUTH0_GOOGLE_CONNECTION_NAME`
- `AUTH0_TOKEN_VAULT_CONNECTION_ID`

Optional model overrides (safe defaults already exist):

- `WARRANT_RUNTIME_MODEL_PROVIDER_ID`
- `WARRANT_RUNTIME_MODEL_TEMPERATURE`
- `WARRANT_RUNTIME_MODEL_TOP_P`
- `WARRANT_RUNTIME_MODEL_MAX_OUTPUT_TOKENS`

Secret-safe key presence check:

```bash
python - <<'PY'
from pathlib import Path
keys = [
  'APP_BASE_URL','AUTH0_DOMAIN','AUTH0_CLIENT_ID','AUTH0_CLIENT_SECRET','AUTH0_SECRET',
  'GOOGLE_API_KEY','AUTH0_GOOGLE_CONNECTION_NAME','AUTH0_TOKEN_VAULT_CONNECTION_ID'
]
vals = {}
for line in Path('.env.local').read_text().splitlines():
  line = line.strip()
  if line and not line.startswith('#') and '=' in line:
    k,v = line.split('=',1)
    vals[k.strip()] = v.strip()
for k in keys:
  v = vals.get(k)
  state = 'PRESENT' if v else ('EMPTY' if k in vals else 'MISSING')
  print(f'{k}: {state}')
PY
```

## 2. Startup Steps

Install and run:

```bash
npm ci
npm run dev
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/demo`

Startup success signals:

- Terminal shows Next.js `Ready`
- `/` shows `Auth0 Access Shell`
- `/demo` shows `Delegated Authority Demo` and `Live readiness preflight`

## 3. Live Readiness Steps

### A. Confirm live model path readiness

1. Go to `/demo`.
2. In `Live readiness preflight`, click `token only` then `Run preflight`.
3. Click `live provider` then `Run preflight`.

Good state:

- Overall preflight state is `ready`.
- `Runtime model configuration` is `ready`.
- In `ready` detail, verify logical model `gemma-4-31b` maps to provider id `gemma-4-31b-it`.

Common bad states:

- `Runtime model configuration: blocked` with missing `GOOGLE_API_KEY`.
- `Auth0 session: blocked` (not signed in).
- `Google connected-account path: blocked` (not connected through Auth0).

### B. Confirm planner/calendar/comms use live Gemma path

Run:

```bash
npm run verify:live-model
```

Good state:

- JSON output with `"ok": true`
- `runtimeConfiguration.logicalModel = "gemma-4-31b"`
- Planner, calendar, and comms sections all present with attempts/repair data.

Bad state:

- `"ok": false` with `stage: "runtime_startup"` or model/provider failure details.

## 4. Manual Demo Test Sequence

Use this exact scenario text where required:

`Prepare my investor update for tomorrow and coordinate follow-ups.`

1. Open `/demo`.
- Expected: Root card shows the exact scenario text above.
- Success: You can see `Root Warrant Approval` and `Investor update for April 18`.
- Failure: Scenario card missing or wrong task text.

2. Confirm planner and child roles are present.
- Click/inspect the graph area (`Delegation Tree`).
- Expected: Planner, Calendar, and Comms nodes appear with runtime IDs.
- Success: Planner shows `runtime-planner-001`; Calendar `runtime-calendar-001`; Comms `runtime-comms-001`.
- Failure: Missing node(s) or missing runtime IDs.

3. Confirm narrower child warrants.
- In `Canonical Proof Points`, compare Planner vs Calendar/Comms capabilities.
- Expected: Child capabilities are strict subsets of parent authority.
- Success: Calendar is calendar-only; Comms is gmail-only; neither adds new authority.
- Failure: Any child capability broader than parent.

4. Confirm schedule and drafting role separation.
- Check timeline and proof cards.
- Expected: Calendar events are schedule/calendar-only; Comms events are draft/send-related.
- Success: `Calendar window reviewed` and `Follow-up drafts prepared` appear separately.
- Failure: Calendar showing email actions or Comms showing calendar actions.

5. Confirm overreach denial.
- In `Canonical Proof Points` and timeline, locate policy denial.
- Expected: Out-of-bounds send is denied.
- Success: `Policy Denial` appears for external recipient attempt.
- Failure: Overreach shown as allowed/executed.

6. Confirm approval-required send.
- In `Canonical Proof Points`, locate approval-gated send card.
- Expected: Send is paused for approval (not executed).
- Success: Status indicates approval-required/pending.
- Failure: Send executes without approval state.

7. Confirm revoke blocking.
- In rehearsal controls, click `Restore` for `Comms revoked (post-revoke)`.
- Expected: Comms branch becomes revoked; post-revoke send is blocked.
- Success: Timeline shows `Comms branch revoked` and post-revoke blocked send.
- Failure: Comms still active or post-revoke send not blocked.

8. Confirm graph/timeline coherence.
- Inspect `Delegation Tree` + `Authorization Timeline` together.
- Expected: Same branch IDs/states represented consistently in both places.
- Success: Revoked/blocked statuses align between graph and timeline.
- Failure: Conflicting state between graph and timeline.

## 5. Expected Outcomes by Gate

- Denied by policy: overreach send to unauthorized recipient is blocked.
- Approval required: in-bounds send remains paused until approval.
- Executed: bounded calendar read and draft actions execute.
- Blocked by revoke: post-revoke Comms send remains blocked.

## 6. Troubleshooting

### Missing model readiness

- Symptom: preflight `Runtime model configuration` is blocked.
- Fix: add `GOOGLE_API_KEY` to `.env.local`; rerun `npm run verify:live-model`.

### Missing Auth0 session

- Symptom: preflight `Auth0 session` blocked.
- Fix: from `/`, click `Continue with Auth0` and complete login.

### Missing Google provider connection

- Symptom: `Google connected-account path` blocked.
- Fix: from `/`, use `Connect Google with Auth0` flow (`/auth/connect`).

### Graph/timeline not updating

- Symptom: preset restore does not update state.
- Fix:
  1. Refresh `/demo`.
  2. Re-run preset restore (`main` or `comms-revoked`).
  3. Check demo tools are enabled (development mode or `WARRANT_ENABLE_DEMO_TOOLS=true`).

### Approval/revoke behavior missing

- Symptom: no approval card or revoke-blocked state.
- Fix:
  1. Ensure you are on `Main scenario (pre-revoke)` for approval-required state.
  2. Switch to `Comms revoked (post-revoke)` for revoke proof.

## 7. Final “Demo Is Ready” Checklist (1–2 minutes)

- [ ] `npm run dev` starts cleanly and `/` + `/demo` load.
- [ ] `/demo` preflight (`token only` and `live provider`) is `ready`.
- [ ] `npm run verify:live-model` returns `"ok": true` with `gemma-4-31b`.
- [ ] Planner/Calendar/Comms runtime IDs are visible in graph/timeline.
- [ ] Policy denial is visible for overreach send.
- [ ] Approval-required send is visible and not auto-executed.
- [ ] `Comms revoked (post-revoke)` shows post-revoke send blocked.
- [ ] Graph and timeline tell the same story without contradictions.

---

Note on truthfulness: `/demo` is fixture-backed for deterministic presentation. Use `Live readiness preflight` plus `npm run verify:live-model` to prove live Gemma/Auth0 provider readiness before recording.
