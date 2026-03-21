# PLANS.md

# Warrant — Master Plan

## One-line thesis

**OAuth was designed for apps. AI agents need warrants.**

## Core product statement

Warrant is a demo-first application that shows how a human can authorize a root agent, which can then delegate narrower, revocable authority to child agents through explicit warrants.

This project exists to demonstrate a missing authorization model for multi-agent systems:

- sub-delegation
- capability narrowing
- branch revocation
- lineage-aware actions
- human-legible downstream authority

## Why this project can win

Most hackathon projects will demonstrate:

- generic assistants
- email/calendar automation
- simple OAuth-connected agents

Warrant aims to demonstrate:

- a new authorization problem
- a concrete product answer
- visible use of Auth0 Token Vault and approval flows
- a polished, easy-to-understand demo artifact

## Master constraints

### Constraint 1

Token Vault must be clearly essential, not incidental.

### Constraint 2

The delegation tree UI must feel crisp and understandable.

### Constraint 3

At least one child agent must visibly fail when attempting to exceed its warrant.

### Constraint 4

At least one sensitive action must visibly require approval.

### Constraint 5

The full core story must fit into a ~3-minute demo.

## Core demo scenario

User prompt:
**“Prepare my investor update for tomorrow and coordinate follow-ups.”**

System behavior:

1. user signs in
2. user connects Google through Auth0
3. planner requests a parent warrant
4. user approves parent warrant
5. planner spawns child agents
6. Calendar Agent reads availability
7. Comms Agent drafts follow-up emails
8. Comms Agent attempts a forbidden action and is blocked
9. Comms Agent requests approval for a sensitive allowed action
10. user revokes Comms branch
11. Comms branch loses authority while Calendar Agent remains active

## Product workstreams

### Workstream A — Auth0 + external connections

Goal:
Establish visible, reliable delegated access to Gmail and Google Calendar through Auth0.

Must prove:

- user can connect provider
- app can access delegated external APIs
- approval flow is usable for sensitive action path

Output:

- working sign-in
- working Google connection
- usable Gmail/Calendar delegated access
- visible approval flow

### Workstream B — Warrant engine

Goal:
Create the application-level delegation model.

Must prove:

- parent warrant issuance
- child warrant narrowing
- TTL / status management
- revocation
- cascade invalidation
- resource-bound checks

Output:

- warrant schema
- issuance logic
- validation logic
- revoke logic
- lineage model

### Workstream C — Agent orchestration

Goal:
Implement the root agent and child-agent task structure.

Must prove:

- planner can spawn sub-agents
- sub-agents receive narrower warrants
- sub-agents only attempt actions within their role
- action attempts are inspectable

Output:

- Planner Agent
- Calendar Agent
- Comms Agent
- optional Docs Agent

### Workstream D — Delegation graph UI

Goal:
Make the authority model visible and understandable.

Must prove:

- parent/child hierarchy
- node statuses
- capabilities
- expiry
- revocation visibility
- denial visibility

Output:

- graph view
- node detail panel
- branch revoke affordance

### Workstream E — Approval UX

Goal:
Make sensitive actions legible and controlled.

Must prove:

- exact action preview
- why approval is needed
- blast radius
- approval result
- impact on downstream action

Output:

- approval screen / panel
- approval state handling
- action outcome display

### Workstream F — Audit and receipts

Goal:
Ensure actions and denials are traceable.

Must prove:

- lineage-aware action log
- denial reasons
- revoke events
- approval events

Output:

- action ledger
- event timeline
- optional human-readable authorization receipt

## Milestones

## Milestone 1 — Foundation

Target:
Auth, provider connection, repo scaffolding, design direction

Includes:

- repo initialized
- root instructions in place
- Auth0 login wired
- Google connection path working
- initial UI shell in place

Acceptance:

- user can sign in
- user can connect Google
- delegated access path is confirmed real

## Milestone 2 — Warrant core

Target:
Warrant creation, storage, narrowing, and validation

Includes:

- warrant schema
- parent/child issuance
- capability narrowing
- TTL handling
- revoke handling
- action validation layer

Acceptance:

- planner can create child warrants
- child warrants cannot exceed parent authority
- warrants can expire or be revoked

## Milestone 3 — Useful agent flow

Target:
User sees value from constrained child agents

Includes:

- planner orchestration
- Calendar Agent
- Comms Agent draft flow
- action ledger basics

Acceptance:

- planner spawns children
- Calendar Agent completes limited task
- Comms Agent drafts a real output
- all actions are tied to warrants

## Milestone 4 — Capability ceiling proof

Target:
The product visibly proves enforcement

Includes:

- blocked overreach attempt
- denial reason display
- local-vs-external gate distinction where applicable

Acceptance:

- a child agent attempts disallowed action
- system blocks it
- UI explains why

## Milestone 5 — Sensitive action approval

Target:
The product visibly proves controlled escalation

Includes:

- send-email approval flow
- exact preview
- approval state handling
- success/failure path

Acceptance:

- Comms Agent requests approval before sending
- user sees exact action preview
- action only succeeds after approval

## Milestone 6 — Branch revoke

Target:
The product visibly proves revocable chains

Includes:

- revoke one agent node
- descendant invalidation
- UI refresh
- failure of post-revoke actions

Acceptance:

- user revokes Comms branch
- Comms branch becomes unusable
- other branches remain active if valid

## Milestone 7 — Packaging

Target:
Submission readiness

Includes:

- polish
- seeded demo scenario
- README
- architecture diagram
- demo script
- video prep
- bonus blog post draft

Acceptance:

- app is deployable
- repo is understandable
- demo can be run predictably

## Suggested implementation order

1. foundation and connection flow
2. warrant schema and validation
3. planner plus child issuance
4. graph UI
5. calendar read + comms draft
6. blocked overreach
7. approval flow
8. branch revoke
9. polish and packaging
10. optional stretch features

## Invariants

These must remain true across all implementation work.

### Invariant A

A child warrant must never exceed the capabilities or resource bounds of its parent.

### Invariant B

All meaningful actions must be attributable through lineage.

### Invariant C

No external action happens without both local warrant approval and external delegated capability.

### Invariant D

Revoking a warrant invalidates descendants.

### Invariant E

User-facing consent text must describe outcomes, not low-level auth terminology.

## Out of scope for MVP

- many third-party providers
- long-running autonomous workflows
- generalized multi-tenant platform features
- advanced billing / user management
- complex model selection work
- abstract standards implementation beyond what demo requires

## Risk register

### Risk 1 — Token Vault appears incidental

Mitigation:

- real Google integration
- explicit provider connection UI
- approval flow prominently tied to sensitive action
- demo narrative repeatedly references delegated external access through Auth0

### Risk 2 — Graph UI looks weak

Mitigation:

- keep hierarchy shallow
- use clear node cards
- prefer readability over visual flash
- avoid over-animating

### Risk 3 — Approval flow instability

Mitigation:

- isolate narrow approval use case
- pre-seed deterministic demo data
- rehearse exact scenario

### Risk 4 — Scope creep

Mitigation:

- keep provider count small
- avoid extra agent types unless core flow is solid
- gate all stretch work behind milestone completion

### Risk 5 — Warrant engine becomes too abstract

Mitigation:

- tie every rule to a visible user action
- always build proof screens
- keep capabilities few and concrete

## Acceptance checklist for the final demo

The final product should visibly show:

- [ ] user signed in
- [ ] Google connected through Auth0
- [ ] root warrant approval
- [ ] child warrant issuance
- [ ] delegation tree
- [ ] Calendar Agent useful limited action
- [ ] Comms Agent useful limited action
- [ ] blocked overreach attempt
- [ ] sensitive action approval
- [ ] branch revocation
- [ ] lineage-aware action history

## Repo docs still to create

After this master plan, create:

1. `.codex/skills/warrant-engine/SKILL.md`
2. `.codex/skills/auth0-ai-agents/SKILL.md`
3. `.codex/skills/delegation-graph-ui/SKILL.md`
4. `.codex/skills/demo-stability/SKILL.md`
5. `.codex/skills/execplan-rules/SKILL.md`

## How Codex should work from this file

For every major task:

1. read AGENTS.md
2. read this PLANS.md
3. identify the milestone and workstream
4. create/update an ExecPlan
5. implement the smallest demo-relevant slice first
6. validate with concrete commands
7. report risks honestly

## ExecPlan — Repo Foundation Scaffold (2026-03-20)

### Objective

Initialize the shared Warrant repository foundation so parallel worktrees can begin feature work on a stable, minimal, demo-aligned base.

### Demo relevance

This is Milestone 1 foundation work. It creates the runnable shell, shared contracts, and clear product-boundary directories the later Auth0, warrant, agent, graph, approval, and audit slices will build on.

### Scope

In scope:

- minimal Next.js + TypeScript + Tailwind scaffold
- top-level product-boundary folders aligned to the thesis and demo path
- placeholder app shell only
- shared contracts/types for cross-worktree coordination
- env example file(s)
- README stub
- lint, test, typecheck, and build scripts

Out of scope:

- real Auth0 integration
- real agent orchestration
- warrant issuance/enforcement logic
- Google provider connection flows
- graph rendering implementation
- persistence and production deployment setup

### Files/modules likely affected

- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `.gitignore`
- `.env.example`
- `README.md`
- `PLANS.md`
- `src/app/*`
- `src/components/*`
- `src/contracts/*`
- `src/auth/*`
- `src/connections/*`
- `src/warrants/*`
- `src/agents/*`
- `src/approvals/*`
- `src/graph/*`
- `src/audit/*`
- `src/demo-fixtures/*`
- `tests/*`

### Invariants to preserve

- Keep the repo demo-first and visibly aligned to the thesis.
- Do not implement product behavior beyond placeholders.
- Keep architecture modular and inspectable rather than abstract.
- Avoid extra providers or non-essential dependencies.
- Keep shared coordination types narrow and boring.
- Preserve the later two-layer enforcement invariant by not faking external capability logic into the scaffold.

## ExecPlan — Auth0 Auth Shell (2026-03-20)

### Objective

Implement the Auth0-facing application shell for the auth-shell track so Warrant visibly supports sign-in, Google connection state, and Auth0-centered delegated external access setup.

### Demo relevance

This is Milestone 1 foundation-and-connection work for Workstream A. It strengthens the first two beats of the demo:

1. user signs in
2. user connects Google through Auth0 Token Vault

It also sets the visible shell later work will plug into for delegated Calendar and Gmail actions.

### Scope

In scope:

- Auth0 Next.js session wiring for App Router
- signed-out, signed-in, and unavailable shell states
- a Google connection panel with visible `connected`, `not connected`, `pending`, and `unavailable` states
- thin Gmail and Calendar access wrappers that distinguish Auth0-backed external readiness from local Warrant policy
- serious, legible user-facing copy
- env placeholders and docs for local setup

Out of scope:

- warrant issuance or enforcement logic
- delegation graph implementation
- real approval workflow backend
- broad multi-provider abstractions
- non-Google external integrations

### Files/modules likely affected

- `package.json`
- `package-lock.json`
- `.env.example`
- `README.md`
- `PLANS.md`
- `src/app/*`
- `src/auth/*`
- `src/connections/*`
- `src/actions/*`
- `src/components/*`
- `src/contracts/*`
- `src/demo-fixtures/*`
- `src/app/globals.css`
- `tests/*`

### Invariants to preserve

- Keep Auth0-backed external access separate from local Warrant policy.
- Make Auth0 visibly load-bearing rather than generic OAuth plumbing.
- Keep Google as the only provider in this slice.
- Do not fake warrant-engine behavior into the auth shell.
- Keep the shell runnable even when Auth0 env values are missing, with explicit unavailable states.
- Use user-facing consequence language instead of low-level auth jargon.

### Implementation steps

1. Add a concrete auth-shell plan and inspect current shell/contracts for reuse points.
2. Install and configure the Auth0 Next.js SDK in a way that degrades safely when env is incomplete.
3. Replace the foundation landing page with an Auth0 shell that renders signed-out, signed-in, and unavailable states.
4. Add a Google connection state model plus a focused connection panel that can accept real Auth0-backed state next.
5. Add thin external action wrappers for Calendar read, Gmail draft, and Gmail send with structured disconnected, unavailable, pending, and approval-required outcomes.
6. Document env requirements and update tests so the shell contracts are covered.

### Validation steps

- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run dev -- --port 3000`

Manual shell checks during local run:

- homepage renders without Auth0 env values
- signed-out shell shows login affordance and unavailable messaging where appropriate
- Google connection panel renders visible status copy
- Calendar and Gmail action placeholders show distinct blocked or pending states

### Known risks

- Real Token Vault or connected-account status may need tenant-specific wiring beyond this slice, so the first pass may rely on explicit server-side placeholder state until the real callback path is connected.
- Without real Auth0 and Google credentials in local env, end-to-end sign-in and provider connection cannot be fully exercised in this worktree.
- Approval state is shell-only here; later approval-track work must replace placeholder approval handling with the real flow.

### Implementation steps

1. Add the ExecPlan and inspect the empty repo baseline.
2. Create package/config files for a minimal Next.js TypeScript Tailwind app.
3. Add a simple homepage and shared shell components that explain the intended worktree boundaries.
4. Create product-boundary directories with placeholder exports so parallel work can land with low merge overlap.
5. Add shared contracts for warrants, agents, actions, approvals, and graph state.
6. Add README and `.env.example` placeholders for future Auth0 and database work.
7. Install dependencies and validate `lint`, `test`, `typecheck`, and `build`.

### Validation plan

- `npm install`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`

### Risks

- Next.js config and lint setup can drift across versions; keep the initial config conventional and minimal.
- Adding too many placeholder files can create noise; keep each boundary lightweight.
- Auth0 and LangGraph are intentionally deferred here, so later worktrees will still need to integrate those dependencies carefully.
