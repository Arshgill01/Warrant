# Warrant — Final 3-Minute Demo Script

## Thesis to state early

`OAuth was designed for apps. AI agents need warrants.`

Say this in the first 15 seconds.

## Pre-stage before recording

1. Run app: `npm run dev`
2. Open `http://localhost:3000/demo`
3. Ensure demo preset is `Main scenario (pre-revoke)`
4. Keep browser zoom at 90-100% so sequence strip + graph are both legible
5. If showing live readiness, sign in and connect Google in a separate tab first (`/`)
6. Keep one backup tab ready with preset `Comms revoked (post-revoke)`

## Screen/flow order (beat-by-beat)

### 0:00-0:20 — Thesis + problem

Screen:

- `/demo` top section with scenario prompt and sequence strip

Script:

- "Warrant answers a specific gap: OAuth gives app-level delegated access, but agent systems delegate internally across branches."
- "This flow shows root authorization, child delegation, overreach denial, approval-gated send, and branch revoke."

### 0:20-0:45 — Root authorization and child delegation

Screen:

- top section, then scroll to delegation graph

Script:

- "Maya authorizes one parent warrant for Planner Agent."
- "Planner delegates narrower Calendar and Comms child warrants. The graph makes branch authority legible."

### 0:45-1:20 — Child activity and denied overreach

Screen:

- `Canonical Proof Points`
- keep Policy Denial card visible

Script:

- "Calendar succeeds in a bounded window."
- "Comms drafts follow-ups for bounded recipients."
- "When Comms overreaches to an out-of-bounds recipient, Warrant denies it as policy denial before provider execution."

### 1:20-1:55 — Approval-required send

Screen:

- Approval-Gated Send proof card
- `Sensitive Action Approval` section with exact action preview

Script:

- "This is distinct from denial: the in-bounds send is policy-eligible but still blocked until explicit human approval."
- "Maya sees the exact message preview and blast radius before release."

### 1:55-2:30 — Branch revoke and immediate effect

Live action:

- trigger Comms revoke in graph detail (or switch preset to `comms-revoked` if needed)

Screen:

- graph with Comms revoked
- Revocation Block proof card

Script:

- "Now Maya revokes only the Comms branch."
- "Post-revoke, Comms send attempts are blocked immediately, while Calendar remains active."

### 2:30-2:55 — Timeline coherence

Screen:

- `Authorization Timeline`

Script:

- "The timeline ties every meaningful action to actor, runtime, warrant lineage, and result."
- "Notice deny, approval, and revoke are separate state transitions, not one generic failure bucket."

### 2:55-3:00 — Close

Script:

- "Auth0 Token Vault is the delegated external access substrate. Warrant adds constrained, revocable delegation chains inside the app."

## What must happen live vs can be pre-staged

Must happen live:

1. show graph with Planner -> Calendar + Comms
2. show denied overreach proof card
3. show approval-required send preview
4. perform revoke (or clearly narrate preset switch if using fallback)

Can be pre-staged:

1. Auth0 sign-in and Google connection
2. live preflight checks
3. scroll position for timeline segment

## Fallback notes

If revoke interaction is risky live:

1. switch to preset `Comms revoked (post-revoke)`
2. say: "This preset is the same scenario after revoke, used for deterministic replay."
3. immediately show:
   - revoked Comms node
   - Revocation Block proof card
   - timeline revoke + blocked post-revoke event

If Auth0/Google live path is unstable:

1. keep demo in deterministic fixture mode
2. briefly mention preflight card exists for live readiness checks
3. do not attempt a live provider write during the timed recording

## Recording checklist

1. Thesis spoken by 0:15
2. Denial/approval/revoke all shown
3. Revocation impact shown before 2:30
4. Timeline coherence shown before close
5. Total runtime under 3:00

