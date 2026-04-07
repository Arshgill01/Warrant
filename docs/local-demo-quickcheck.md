# Local Demo Quickcheck (Pre-Recording)

Run this in order right before recording.

1. Start app:

```bash
npm run dev
```

2. Open `http://localhost:3000/demo` and run `Live readiness preflight` in both modes:
- `token only` -> `Run preflight`
- `live provider` -> `Run preflight`

Pass condition: overall state `ready` in live provider mode.

3. Verify live Gemma path:

```bash
npm run verify:live-model
```

Pass condition: JSON includes `"ok": true`, `"logicalModel": "gemma-4-31b"`, and planner/calendar/comms sections.

4. In `/demo`, confirm proof beats:
- Planner + Calendar + Comms nodes visible with runtime IDs.
- Policy denial visible for overreach send.
- Approval-required send visible (not auto-executed).
- Switch preset to `Comms revoked (post-revoke)` and confirm post-revoke send is blocked.

5. Final stop/go decision:
- `GO` only if all checks above pass.
- `NO-GO` if live preflight is blocked/error or live-model probe fails.
