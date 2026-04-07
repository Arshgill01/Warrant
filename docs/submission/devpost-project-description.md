# Warrant — Devpost Project Description

## Project summary (short)

Warrant is a demo-first authorization model for multi-agent systems. It proves that app-level OAuth consent is not enough when a root agent delegates work to child agents. A human authorizes a parent warrant, the planner issues narrower child warrants, sensitive actions require explicit approval, and one branch can be revoked without killing the others.

## What we built

Most agent demos stop at: "the app has OAuth, so the agent can act."
Warrant shows the missing layer:

- who delegated authority to which child agent
- what each child is allowed to do
- where delegation is narrowed
- when a sensitive action needs explicit user approval
- how one branch can be revoked immediately without affecting sibling branches

The core scenario is:
`Prepare my investor update for tomorrow and coordinate follow-ups.`

In that flow, Planner delegates to Calendar and Comms child agents. Calendar succeeds inside a bounded read window. Comms drafts follow-ups, then attempts an overreach send and gets denied by policy. A bounded send path is approval-gated. After revocation, Comms loses authority immediately and later sends are blocked.

## Why this matters

OAuth gives app-level delegated access, but multi-agent systems create delegated chains inside the app. Without a local delegation contract, all downstream actions collapse into one flat consent boundary.

Warrant adds that missing local contract:

- parent-child lineage
- capability narrowing
- resource constraints
- branch revocation with descendant invalidation
- audit-friendly denial/approval/revoke records

## Auth0 and Token Vault role

Auth0 for AI Agents + Token Vault are load-bearing:

- user identity/session boundary
- Google connected-account flow
- delegated Gmail/Calendar provider path
- approval/execution-release boundary for sensitive send

Warrant does not replace Auth0. It layers local delegation control on top of Auth0-backed external capability.

## Key features

- Parent and child warrants with strict narrowing
- Distinct Planner, Calendar, and Comms roles with runtime attribution
- Policy denial for out-of-bounds overreach attempts
- Approval-required boundary for sensitive Gmail send
- Branch revoke that blocks later actions immediately
- Delegation graph + timeline that stay derived from canonical scenario state
- Deterministic rehearsal presets for repeatable 3-minute demo runs

## What this project proves

1. OAuth is necessary but incomplete for multi-agent delegation.
2. Sensitive actions need both delegated provider access and local branch-level policy.
3. Human control must include revoking downstream branches, not only granting root consent.
4. Authorization state must be legible: judges can see deny vs approval vs revoke as separate outcomes.

