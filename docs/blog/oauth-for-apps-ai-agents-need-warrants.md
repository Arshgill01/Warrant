# OAuth Was Designed for Apps. AI Agents Need Warrants.

## The practical problem

If you have built an agent-enabled product recently, you have probably shipped some version of this:

1. User signs in.
2. User connects Google or Microsoft.
3. Agent can now read and write on the user’s behalf.

That flow works when one app process acts as one principal. It gets shaky when a root planner starts delegating to specialized child agents.

Our hackathon project, Warrant, started from one narrow question:

What authorization model do we need once a user-approved planner delegates to specialized child agents with different risk profiles?

Short answer: app-level OAuth consent is necessary, but not sufficient.

## Where flat consent breaks

OAuth gives your app delegated tokens. It does not model internal delegation chains or branch-level authority.

Once your planner decomposes work, you now have multiple actors:

- Planner agent (decomposes)
- Calendar agent (reads schedule context)
- Comms agent (drafts and maybe sends)

If all those branches share one flat "the app is authorized" truth, two important controls disappear:

- capability narrowing per child branch
- branch-level revocation after authority was already delegated

You can still hardcode checks in business logic, but without an explicit delegation contract the system becomes hard to inspect, hard to audit, and hard to revoke safely.

## Why Token Vault is still non-negotiable

This is not an OAuth replacement argument.

In Warrant, Auth0 for AI Agents + Token Vault are load-bearing:

- user identity/session boundary
- provider connected-account flow
- delegated external access path to Calendar/Gmail
- execution-release boundary for sensitive send actions

Without Auth0’s delegated provider path, our external actions cannot run.

But Token Vault alone still answers only part of the question:
"Can the app call Google right now?"

For multi-agent delegation, we also need:
"Should this branch be allowed to request this action at this point in lineage?"

## What we added: a warrant layer

A warrant is an application-level delegation contract attached to lineage:

- `id`, `parentId`, `agentId`
- purpose
- capabilities
- resource constraints
- delegation controls (`canDelegate`, `maxChildren`)
- expiry and status

Child warrants can only narrow parent authority. They cannot expand.

That gives us an explicit local policy gate before provider execution:

1. Local warrant check (`capability + constraints + status`)
2. Approval check (for sensitive actions)
3. Auth0/provider readiness check

Only after all three pass do we execute externally.

At a high level, the split of responsibilities is:

- Auth0/Token Vault: identity + external delegated access rails
- Warrant layer: internal delegation rules and branch lifecycle control

## Concrete product moments from the demo

The scenario prompt is intentionally mundane:
`Prepare my investor update for tomorrow and coordinate follow-ups.`

The proof moments are about control boundaries, not model novelty.

### 1) Child warrant narrowing

Planner gets the parent warrant, then delegates narrower child warrants:

- Calendar can read one bounded time window
- Comms can draft for bounded recipients and request one send

### 2) Overreach denial

Comms attempts a send to an out-of-bounds recipient.
Warrant blocks it as `denied_policy` before any provider execution path is considered.

### 3) Approval-gated send

Comms prepares an in-bounds send.
Even though policy allows the branch to request it, execution pauses until user approval of the exact message preview.

### 4) Branch revoke

User revokes the Comms branch.
Later Comms send attempts are blocked immediately, while Calendar remains active.

That is the insight in one line:
authorization should remain controllable after delegation, not only at initial root consent.

A practical detail that mattered for us: approval state is represented separately from policy denial and provider failure. That made "why this is blocked" understandable in under a minute during demo reviews.

## Why this matters for Auth0 builders

If you are building with Auth0 AI surfaces today, you already have a strong substrate for identity and delegated external access.

The next question is internal authority shape:

- How does authority fan out when agents spawn workers?
- Which branch can do what?
- How do you revoke one risky branch without shutting everything down?
- How do you explain deny/approval/revoke events to humans quickly?

Token Vault gives trustworthy external delegation rails.
A warrant layer gives legible internal delegation governance.

## Implementation takeaways that improved reliability

1. Keep local-policy and provider-readiness outcomes separate.
   - Do not collapse denial, approval-pending, and provider-unavailable into one generic blocked state.
2. Keep approval-required as a first-class state, not an afterthought.
   - "Draft authority" and "send authority" should be visibly different.
3. Make graph and timeline derive from one canonical scenario state.
   - If UI surfaces drift, your security story drifts.
4. Make revocation branch-scoped and immediate.
   - Revocation should not feel like soft UI deletion.

5. Keep actor identity and lineage attached to every meaningful event.
   - We kept root request ID, acting runtime actor, warrant ID, parent warrant ID, and result together in timeline records.

## Closing

OAuth solved delegated access for apps.
Agent systems introduce delegated chains inside apps.

The pattern we are proposing is:

- Auth0/Token Vault for identity and external delegated access
- Warrant-like delegation contracts for internal branch authority

Humans should not only authorize root agents.
They should authorize constrained chains of delegated authority they can inspect and revoke.
