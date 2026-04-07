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

## ExecPlan — Child Runtime Actors (2026-04-03)

### Objective

Implement real Calendar Agent and Comms Agent runtime actors with distinct identities, role-specific prompts/context/input/output contracts, structured output validation, one-retry repair logic, and explicit runtime events for invalid/degraded behavior.

### Demo relevance

This strengthens Milestone 3 (Useful agent flow) and supports Milestones 4-5 by making child-agent reasoning inspectable, constrained, and non-magical while preserving the rule that privileged actions are still controlled outside runtime/model calls.

### Scope

In scope:

- runtime contracts for Calendar and Comms child actors
- shared model-adapter invocation path for both runtimes
- role-specific structured outputs and validation
- one repair retry on invalid model output
- structured runtime failure result after retry exhaustion
- explicit runtime events for invalid-output and degraded paths
- deterministic tests for valid and invalid/retry/failure scenarios

Out of scope:

- full control bridge wiring
- direct privileged API execution inside runtime/model invocation
- planner orchestration redesign
- non-calendar/non-comms child runtimes

### Files/modules likely affected

- `PLANS.md`
- `src/agents/*`
- `src/contracts/*` (runtime-facing types if needed)
- `tests/*` (runtime coverage)

### Invariants to preserve

- Calendar and Comms roles remain distinct in input, context, output, and allowable proposals.
- Comms draft generation and send proposal generation are distinct concepts.
- Child runtimes cannot silently expand authority beyond their role/warrant intent.
- Structured output validation is mandatory; freeform parsing cannot be system truth.
- Runtime/model calls do not directly execute privileged actions.

### Implementation steps

1. Define runtime contracts and a shared model adapter interface with explicit runtime identity and event types.
2. Implement Calendar runtime with schedule-focused prompt, role-specific input/output schema, and validated proposal/summary output.
3. Implement Comms runtime with draft-focused prompt, distinct optional send-proposal output, and explicit non-execution semantics.
4. Add shared invalid-output handling with one repair retry max and structured failure fallback.
5. Emit runtime events for success, invalid output, retry, and failure/degraded paths.
6. Add deterministic tests covering valid output and invalid/retry/failure paths for each runtime.
7. Run lint, typecheck, tests, and build before final report.

### Validation steps

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Targeted deterministic runtime checks via unit tests:

- Calendar valid path
- Calendar invalid->repair path
- Calendar invalid->retry-exhausted failure path
- Comms valid draft path
- Comms valid draft+send-proposal path
- Comms invalid->repair/failure paths

### Known risks

- No existing schema library is installed, so initial validation may require explicit TypeScript guards; this is reliable but verbose.
- Prompt text quality impacts runtime realism; tests should validate contract shape and role separation rather than natural-language quality.
- Integration into broader planner flow may require a follow-up slice once control-bridge interfaces are finalized.

### Implementation steps

1. Add the ExecPlan and inspect the empty repo baseline.
2. Create package/config files for a minimal Next.js TypeScript Tailwind app.
3. Add a simple homepage and shared shell components that explain the intended worktree boundaries.
4. Create product-boundary directories with placeholder exports so parallel work can land with low merge overlap.
5. Add shared contracts for warrants, agents, actions, approvals, and graph state.
6. Add README and `.env.example` placeholders for future Auth0 and database work.
7. Install dependencies and validate `lint`, `test`, `typecheck`, and `build`.

## ExecPlan — Auth0 Foundation Track (2026-03-23)

### Objective

Harden the Auth0 foundation in the current Next.js App Router shell so Warrant has a real Auth0 session boundary, a visible signed-in shell, and a Google connection surface that is ready for Token Vault-backed Gmail and Calendar work in later branches.

### Demo relevance

This work strengthens the first two beats of the core demo:

1. user signs in
2. user connects Google through Auth0 Token Vault

It also makes Auth0 visibly load-bearing before the warrant engine, approval flow, and delegation graph land.

### Scope

In scope:

- validate and tighten the official Auth0 Next.js SDK setup already present in the repo
- keep middleware-based route handling aligned with the installed SDK
- implement or refine login, logout, and session-derived shell states
- make the signed-in shell visibly distinct from the signed-out shell
- expose Google connection state in a way that is easy for later Token Vault-backed actions to consume
- document required vs optional auth env vars for local setup
- add or update tests around auth env parsing, session-driven UI state, and Google connection wiring

Out of scope:

- local Warrant issuance, narrowing, or enforcement logic
- approval-flow implementation
- delegation graph logic
- real Gmail or Calendar action execution
- non-Google provider integration

### Files/modules likely affected

- `PLANS.md`
- `.env.example`
- `README.md`
- `package.json`
- `src/app/*`
- `src/auth/*`
- `src/connections/*`
- `src/components/auth-shell/*`
- `src/contracts/*`
- `tests/auth-shell.test.ts`

### Invariants to preserve

- Auth0 app auth and provider-backed delegated access stay separate from local Warrant logic.
- Auth0 must remain visible in the product narrative, not buried as generic OAuth plumbing.
- The shell must clearly distinguish: signed out, signed in, Google not connected, Google connected, and Google unavailable or error.
- The app should still boot with missing Auth0 env, but it must explain exactly what is missing.
- Google connection naming and config should be easy to reuse later for Token Vault-backed Gmail and Calendar paths.

### Implementation steps

1. Inspect the current auth shell against the installed `@auth0/nextjs-auth0` package and remove any weak or misleading scaffolding.
2. Tighten env parsing and auth client setup so required vs optional values are explicit and the shell can explain incomplete configuration clearly.
3. Refine session and Google connection snapshots so the UI cleanly renders the required signed-in, signed-out, connected, disconnected, and unavailable states.
4. Improve the homepage shell copy and structure so Auth0 sign-in and Google connection state are obvious and later provider-action branches have a stable surface to plug into.
5. Update `.env.example` and docs with concrete local setup steps, required callback/logout URLs, and which pieces still depend on external Auth0 dashboard or Google connection configuration.
6. Add or update targeted tests, then run repo-native validation plus a local boot check.

### Validation steps

- `npm install`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run dev -- --port 3000`

Manual checks during local run:

- home page boots with missing env and explains the missing Auth0 setup
- signed-out shell renders a login affordance
- signed-in shell renders a logout affordance and user identity when a session exists
- Google panel visibly distinguishes not connected, connected, and unavailable states
- docs and `.env.example` match the implemented config surface

### Known risks

- Real Google connected-account state still depends on Auth0 tenant setup, enabled connection flow, and Token Vault configuration outside this repo.
- End-to-end sign-in cannot be fully verified without valid local credentials in `.env.local` and corresponding Auth0 dashboard URLs.
- The current branch can prepare Gmail and Calendar delegated-access boundaries, but it should not claim real provider action execution until a later branch exercises those paths end to end.

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

## ExecPlan — Warrant Core Engine (2026-03-20)

### Objective

Build the pure Warrant engine that defines warrant contracts, parent-to-child narrowing rules, lineage-aware authorization decisions, and descendant revocation behavior.

### Demo relevance

This is Milestone 2 / Workstream B. It provides the proof that delegated authority can narrow, expire, and revoke in ways judges can inspect, including the required blocked-overreach beat in the demo.

### Scope

In scope:
- shared warrant and action contract updates needed for the engine
- core warrant domain types and resource-constraint structures
- parent-to-child narrowing validation
- warrant issuance helpers
- active / expired / revoked evaluation
- branch and descendant revocation logic at the domain level
- one pure action-authorization function with structured allow/deny output
- readable denial reasons and lineage-friendly audit metadata
- automated tests for the core invariants

Out of scope:

- Auth0 or Token Vault integration
- UI, routes, or app-shell behavior
- persistence and database schema
- agent orchestration and external API adapters
- approval-flow implementation beyond contract-aware authorization results

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/warrant.ts`
- `src/contracts/action.ts`
- `src/contracts/index.ts`
- `src/warrants/*`
- `tests/*`

### Invariants to preserve

- A child warrant must never exceed parent authority.
- Revoking a warrant must invalidate descendants.
- Expired warrants must deny authorization even without manual revocation.
- Authorization decisions must be explainable with human-readable denial reasons.
- Keep the engine framework-agnostic, pure, and independent from Auth0 logic.
- Preserve existing repo boundary exports used by the scaffold.

### Implementation steps

1. Extend the bootstrap warrant/action contracts only where needed to support lineage, narrowing, and authorization results.
2. Add pure warrant-domain modules for types, narrowing helpers, issuance, status evaluation, ancestry checks, and revocation.
3. Implement one authorization entrypoint that evaluates status, ancestry, capability, and resource constraints and returns structured allow/deny data.
4. Re-export the engine through `src/warrants` without breaking the existing worktree-boundary placeholder.
5. Add focused Vitest coverage for the required proof cases and core invariants.
6. Run targeted test and typecheck/lint validation for the warrant engine changes.

### Validation plan

- `npm run test`
- `npm run typecheck`
- `npm run lint`

### Risks

- Shared contract changes could create merge pressure for other worktrees; keep them narrowly additive and boring.
- Resource constraints will start intentionally small and explicit, so later integrations may need new fields without weakening current invariants.
- Revocation is domain-level only in this slice; persistence and concurrent updates remain a later integration concern.

## ExecPlan — Deterministic Demo Scenario Fixtures (2026-03-21)

### Objective

Create a canonical, deterministic demo scenario and fixture/event layer for the prompt: “Prepare my investor update for tomorrow and coordinate follow-ups.”

### Demo relevance

This work supports Milestone 3 through Milestone 5 by making the core story boringly repeatable: useful child action, blocked overreach, approval-pending action, branch revocation, and timeline-ready lineage.

### Scope

In scope:

- shared demo scenario contracts for seeded identities, warrants, actions, approvals, revocations, and timeline events
- canonical fixture data for the default demo path
- deterministic helper functions to load and reset demo state in memory
- graph-friendly derived nodes and timeline-ready human-readable event entries
- tests that prove deterministic shape, core demo beat coverage, and reset behavior

Out of scope:

- real Auth0, OAuth, or Token Vault integration
- real warrant enforcement or issuance logic
- real persistence or database seeding
- UI-specific rendering assumptions
- replacing future product behavior with mock-only business logic

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/action.ts`
- `src/contracts/agent.ts`
- `src/contracts/approval.ts`
- `src/contracts/graph.ts`
- `src/contracts/index.ts`
- `src/demo-fixtures/*`
- `tests/*`
- `README.md`

### Invariants to preserve

- Keep fixtures demo-first, deterministic, and reusable across worktrees.
- Do not fake or replace the real warrant or Auth0 enforcement layers.
- Keep child authority narrower than parent authority in seeded data.
- Ensure every important action, approval, and revocation remains lineage-aware.
- Avoid hard-wiring graph or approval UI assumptions into shared fixture contracts.

### Implementation steps

1. Extend the shared contracts only where needed to support seeded demo data and timeline events.
2. Define the canonical demo scenario shape and seed the default user, agents, warrants, actions, approvals, revocations, and timeline entries.
3. Add deterministic loader/reset helpers that return isolated copies of the canonical state for other worktrees and tests.
4. Add small derivations that make the fixture data directly usable by graph and timeline consumers without forcing a specific UI.
5. Add tests covering repeatability, required demo beats, lineage consistency, and reset isolation.
6. Update lightweight docs so other worktrees know where the canonical demo data lives.

### Validation plan

- `npm run test`
- `npm run typecheck`
- `npm run lint`

### Risks

- Shared contracts may still evolve when warrant-engine and graph-ui land, so keep this layer intentionally narrow and composable.
- Human-readable timeline text can drift from future UI copy; treat it as demo fixture content, not final product wording.
- In-memory reset helpers improve repeatability locally but do not replace future persistence reset paths.

## ExecPlan — Wave 1 Post-Merge Stabilization (2026-03-21)

### Objective

Resolve the post-merge integration errors across the four completed Wave 1 branches so the repo reaches a clean baseline where tests pass, typecheck is green, and the merged demo slices remain aligned.

### Demo relevance

This is stabilization work across Milestone 1 and Milestone 2 outputs. It matters because the Wave 1 demo path is only credible if the merged shell, warrant engine, graph slice, and deterministic fixtures can coexist without import failures or contract drift.

### Scope

In scope:

- install and verify merged dependencies required by the auth shell and graph UI slices
- fix Auth0 SDK import or usage mismatches introduced by the merge
- reconcile shared contract drift between the warrant-engine, graph, and demo-fixtures branches
- update fixture data so seeded warrants, actions, and timeline objects match the current shared contracts
- restore a passing automated test suite and clean typecheck baseline

Out of scope:

- new product features beyond what the four Wave 1 branches already intended
- broad refactors to architecture or ownership boundaries
- replacing placeholder Auth0 or approval behavior with production-grade integrations
- redesigning graph or shell UX beyond changes required to restore correctness

### Files/modules likely affected

- `PLANS.md`
- `package.json`
- `package-lock.json`
- `src/auth/*`
- `src/contracts/*`
- `src/demo-fixtures/*`
- `src/graph/*`
- `src/components/graph/*`
- `src/app/*`
- `tests/*`
- `README.md`

### Invariants to preserve

- Keep Auth0-backed external access separate from local Warrant policy.
- Preserve the warrant-engine invariants: narrowing only, expiry awareness, and descendant invalidation on revocation.
- Keep deterministic demo fixtures lineage-aware and representative of the core hackathon story.
- Do not introduce broad refactors or new abstractions before reviewing them.
- Prefer owner-aligned, minimal fixes in shared surfaces rather than expanding overlap further.

### Current failure checklist

- `@auth0/nextjs-auth0` is declared in the merged manifests but not installed in `node_modules`, so auth-shell tests cannot load the Auth0 module tree.
- `src/auth/auth0.ts` may also be using Auth0 SDK subpath imports that do not match the installed package layout and need verification after install.
- Graph dependencies from the graph branch (`@xyflow/react`, `lucide-react`) also need install verification in the merged workspace.
- `src/contracts/warrant.ts` now requires fields like `rootRequestId`, `createdBy`, `createdAt`, `revokedAt`, `revocationReason`, `revocationSourceId`, and `revokedBy`, but seeded warrants in `src/demo-fixtures/*` do not populate them.
- `WarrantResourceConstraints.calendarWindow` is now structured as `{ startsAt, endsAt }`, but fixtures still use a string interval.
- `DemoActionAttempt` defines `outcomeReason` but fixture/test data still expects an `outcome` field.
- Graph and fixture consumers need to be checked against the merged contract types so node rendering and sample data agree again.

### Implementation steps

1. Install the merged dependency set and rerun the narrow validation commands to separate missing-install failures from real code incompatibilities.
2. Verify the Auth0 Next.js SDK API surface in the installed version and make the smallest import or usage corrections needed in `src/auth/*`.
3. Reconcile the shared contracts by choosing one canonical shape per merged DTO and updating fixtures/tests to match, without broad redesign.
4. Update deterministic scenario and graph fixture data so warrants, action attempts, and derived graph inputs satisfy the current contract requirements.
5. Fix any remaining type errors in graph or shell consumers caused by the merged contract changes.
6. Rerun tests, typecheck, and lint; only consider follow-up cleanup after the baseline is green.

### Validation plan

- `npm install`
- `npm run test`
- `npm run typecheck`
- `npm run lint`

### Risks

- The Auth0 SDK may require small API adjustments beyond installation if the branch targeted a different package version or subpath layout.
- Shared DTO conflicts are a symptom of branch overlap; forcing every consumer to conform to one canonical contract may expose additional mismatches after the first fixes land.
- Keeping the fix scope tight means some longer-term ownership cleanup should stay deferred until after the merged Wave 1 baseline is stable.

## ExecPlan — Wave 1 Compose Demo Surface (2026-03-21)

### Objective

Compose the already-merged Wave 1 auth shell, delegation graph, warrant fixtures, and timeline data into one coherent visible demo surface by adding a dedicated `/demo` route while preserving `/` as the auth/setup entry page.

### Demo relevance

This supports Milestone 3 and Milestone 4 presentation readiness. Judges need to see the seeded scenario, the delegation tree, and the lineage-aware event trail in one place without requiring live Auth0 configuration just to render the demo story.

### Scope

In scope:

- add a dedicated `/demo` route that renders a unified Wave 1 surface
- keep `/` focused on auth/setup and preserve its current behavior
- replace orphaned graph-only mock wiring with canonical demo fixture/state data where practical
- surface the seeded scenario summary, fixture-backed vs auth-backed boundaries, delegation graph, and timeline/event data on `/demo`
- make the demo route resilient when Auth0 env vars are absent
- run full validation plus a local app smoke check for `/` and `/demo`

Out of scope:

- new provider integrations or external API behavior
- Wave 2 orchestration or live agent execution
- approval-flow implementation beyond showing existing fixture-backed pending state
- warrant-engine rewrites or new authorization rules
- broad route architecture changes or major styling churn

### Files/modules likely affected

- `PLANS.md`
- `src/app/page.tsx`
- `src/app/demo/page.tsx`
- `src/components/auth-shell/*`
- `src/components/foundation/*`
- `src/components/graph/*`
- `src/graph/delegation-graph.tsx`
- `src/demo-fixtures/*`
- `src/contracts/*`
- `tests/*`

### Invariants to preserve

- `/` must remain useful as the auth/setup surface and should keep its current Auth0 shell behavior.
- `/demo` must render without requiring real Auth0 environment variables.
- The graph must stay shallow, legible, and obviously lineage-driven.
- Demo copy must clearly distinguish fixture-backed scenario state from auth-backed setup state.
- Child authority and revocation lineage shown in the UI must continue to reflect the canonical seeded scenario, not ad hoc view-only data.
- Avoid introducing new product scope or broad routing abstractions.

### Implementation steps

1. Audit the current graph component and identify where it still depends on stale, graph-local mock data instead of the canonical demo scenario.
2. Adapt the graph composition layer to accept canonical fixture/state inputs and preserve branch revocation behavior in the visible UI.
3. Create a dedicated `/demo` page that loads the seeded scenario, derived delegation nodes, and timeline events from `src/demo-fixtures`.
4. Compose the demo page from existing cards/components where possible, adding only the minimal new scaffolding needed to explain scenario context, auth-backed versus fixture-backed sections, and event history.
5. Add a low-risk navigation affordance between `/` and `/demo` only where it improves discoverability without changing the auth shell’s role.
6. Add or update tests for the new route/composition behavior if the current test suite covers these surfaces.
7. Run lint, typecheck, tests, build, then start the app and manually verify `/` and `/demo`.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run dev`
- manually verify `http://localhost:3000/`
- manually verify `http://localhost:3000/demo`

### Risks

- The current graph component keeps local mutable state and graph-local mock imports, so converting it to canonical fixture inputs may expose type or interaction drift.
- Manual smoke checks may rely on local browser automation or terminal fetches rather than a full end-to-end test harness.
- If the auth shell assumes live Auth0 affordances in more places than expected, linking it cleanly to a no-env demo route may require small fallback copy changes.

## ExecPlan — Wave 1 Shared Contract Unification (2026-03-22)

### Objective

Unify the merged Wave 1 shared contracts so graph, timeline, approvals, actions, and demo fixtures all consume one small, explicit display-data contract layer with adapters instead of passing raw domain models directly into UI surfaces.

### Demo relevance

This supports Milestone 3 through Milestone 5 by reducing merge friction before later integration work lands. The demo path depends on the graph, approval state, blocked action proof, and timeline all telling the same lineage-aware story without contract drift or UI-only type forks.

### Scope

In scope:

- inspect the merged contract and fixture shapes from warrant-core, graph-ui, demo-fixtures, and auth-shell
- define one canonical shared contract path for graph and timeline display DTOs
- add small adapter functions that map demo/domain data into those DTOs
- update graph UI consumers to use the adapter-fed display contracts instead of raw warrant internals where practical
- remove duplicate or conflicting local type definitions that overlap with the shared DTOs
- keep seeded demo data aligned with the canonical contracts

Out of scope:

- warrant-engine rule changes or authorization-behavior redesign
- approval-flow orchestration or new backend behavior
- new providers, new integrations, or broader product scope
- broad UI redesign or route architecture changes
- persistence or orchestration refactors

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/*`
- `src/demo-fixtures/*`
- `src/graph/*`
- `src/components/graph/*`
- `src/app/demo/page.tsx`
- `src/components/foundation/foundation-shell.tsx`
- `tests/*`

### Invariants to preserve

- Keep domain models separate from UI view models.
- Preserve warrant-engine invariants: narrowing only, expiry awareness, and descendant invalidation.
- Keep the graph shallow, stable, and lineage-aware.
- Keep demo fixtures deterministic and aligned with the core three-minute story.
- Prefer adapters over invasive rewrites or new architecture layers.
- Keep the shared contracts small, explicit, and easy to inspect.

### Implementation steps

1. Audit the current merged contracts and identify where raw warrant/demo domain models leak into graph and timeline UI surfaces.
2. Define one canonical shared display-contract module for graph nodes, graph edges, warrant summaries, action attempt records, approval state records, and timeline events.
3. Add adapter helpers that derive those display DTOs from the canonical demo scenario and existing domain contracts without changing the underlying warrant engine behavior.
4. Update graph view-model and detail-panel wiring to consume the shared display DTOs instead of graph-local or domain-leaking shapes.
5. Replace or remove duplicate local definitions that conflict with the shared contracts, keeping public imports boring and consistent.
6. Update tests so demo fixtures and graph consumers validate against the unified contracts.

### Validation plan

- `npm run typecheck`
- `npm run test`
- `npm run build`

### Risks

- Some existing DTOs are already halfway between domain and presentation concerns, so tightening the boundary may expose more coupling than expected in graph or demo consumers.
- The graph currently performs local revocation UI state updates; keeping that behavior while moving to display DTOs needs care so the visible demo interaction does not regress.
- If later tracks need richer timeline or approval metadata, the shared DTOs may need additive fields, so this slice should stay intentionally minimal rather than speculative.

## ExecPlan — Quality Gates Validation Baseline (2026-03-22)

### Objective

Strengthen repo-level validation so parallel worktrees can merge against a shared, predictable baseline with consistent lint, typecheck, test, and build entry points.

### Demo relevance

This supports Milestone 7 packaging and overall technical execution. A stable validation baseline reduces merge breakage across worktrees and makes the demo path easier to keep releasable while feature branches land in parallel.

### Scope

In scope:

- verify the current repo scripts for lint, typecheck, test, and build exist and match the installed tooling
- tighten script naming or composition only where it improves consistency and merge safety
- add minimal validation guidance or lightweight CI if it uses the existing toolchain
- run the improved validation commands and record exact outcomes

Out of scope:

- product behavior changes
- broad tooling migration or formatter adoption
- dependency churn beyond what is required for script consistency
- large CI matrices, caching optimization, or release automation

### Files/modules likely affected

- `PLANS.md`
- `package.json`
- `README.md`
- `.github/workflows/*`

### Invariants to preserve

- Do not change user-facing product behavior.
- Keep package-manager and config changes minimal and merge-friendly for this wave.
- Reuse the current npm, Next.js, ESLint, TypeScript, and Vitest setup rather than introducing new tooling.
- Avoid broad formatting churn or repo-wide refactors.
- Validation entry points should stay obvious enough for both local use and CI reuse.

### Implementation steps

1. Inspect the existing scripts, config files, and repo docs to identify inconsistencies or missing validation entry points.
2. Add the smallest script or workflow changes needed to make lint, typecheck, test, and build run through a consistent baseline command set.
3. Add brief local or CI guidance only if it materially improves merge safety without expanding tooling scope.
4. Run the relevant validation commands against the updated baseline and capture exact pass/fail results.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- any new aggregate validation command added as part of this slice

### Risks

- Existing scripts may already be semantically correct but still fail because of unrelated branch-level code issues, limiting how much “tightening” is appropriate in this slice.
- Adding even a minimal CI workflow can create maintenance overhead if local scripts and workflow steps drift later.
- Next.js build behavior can be slower or more environment-sensitive than the other gates, so a single aggregate command must remain easy to diagnose when one step fails.

## ExecPlan — Validation Baseline Cleanup (2026-03-22)

### Objective

Fix the current lint and typecheck blockers so the repo-level validation baseline added in the previous slice actually passes.

### Demo relevance

This strengthens Milestone 7 packaging and protects the demo path from merge instability. A red baseline on the shared demo and graph surface makes parallel worktree integration risky even when product behavior is otherwise unchanged.

### Scope

In scope:

- remove unused imports and other lint blockers in the demo and graph UI files
- replace the explicit `any` in the node detail panel with a typed constraint formatter
- correct the React Flow background props so typecheck and build succeed
- rerun the validation commands until the baseline status is clear

Out of scope:

- graph UX redesign
- auth or middleware fixes unrelated to the current validation failures
- broad refactors across contracts, fixtures, or component structure
- warning cleanup that does not affect the shared validation gates

### Files/modules likely affected

- `PLANS.md`
- `src/app/demo/page.tsx`
- `src/components/graph/agent-node.tsx`
- `src/components/graph/node-detail-panel.tsx`
- `src/graph/delegation-graph.tsx`

### Invariants to preserve

- Do not change product behavior or seeded demo semantics.
- Keep the delegation graph interactions and revoke behavior intact.
- Keep the fix scope narrow and merge-friendly.
- Do not expand validation/tooling scope while fixing these code issues.

### Implementation steps

1. Remove unused imports and dead code flagged by ESLint in the affected demo and graph files.
2. Replace the `any`-typed resource-constraint formatter with a type derived from the warrant contract.
3. Adjust the React Flow background usage to match the installed component types without changing the visual direction materially.
4. Run lint, typecheck, tests, build, and the aggregate validate command to confirm the repo baseline.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run validate`

### Risks

- The graph surface may have additional latent issues that only appear after the current lint/type blockers are removed.
- Next.js build still surfaces Auth0 Edge-runtime warnings, so a fully clean build log may require a separate auth-focused slice later.

## ExecPlan — Post-Merge Validation Recovery (2026-03-22)

### Objective

Restore a working shared validation baseline after the recent feature-branch merge by removing unresolved conflicts, reconciling overlapping graph changes, and fixing whatever additional lint, typecheck, test, or build failures surface next.

### Demo relevance

This is directly demo-critical. A broken merged `master` branch blocks the graph, the shared demo route, and every later feature slice from being trusted for the three-minute walkthrough.

### Scope

In scope:

- run the repo validation baseline and capture exact failures in the merged branch
- resolve merge conflict markers in code and planning artifacts
- reconcile graph UI changes against the current shared display-contract layer
- rerun validation after each recovery slice and fix the next highest-signal blocker
- keep `PLANS.md` aligned with the actual recovery sequence and current repo status

Out of scope:

- new product features unrelated to merge fallout
- broad graph redesigns or warrant-engine redesigns
- dependency or tooling churn unless a gate cannot be restored without it
- speculative cleanup that does not affect the failing validation path

### Files/modules likely affected

- `PLANS.md`
- `src/components/graph/*`
- `src/graph/*`
- any additional files surfaced by `npm run validate`

### Invariants to preserve

- Keep the current display-contract adapter model intact for graph and demo surfaces.
- Keep delegation-graph revoke behavior and status transitions demo-legible.
- Keep fix slices narrow, reviewable, and grounded in actual gate failures.
- Do not claim a clean baseline until `npm run validate` completes successfully.

### Implementation steps

1. Run `npm run validate` and record the first failing gate with exact errors.
2. Remove unresolved merge conflict markers and reconcile the affected files to the current repo contracts and component interfaces.
3. Rerun validation immediately after each fix to surface the next blocker instead of guessing.
4. Fix remaining lint, typecheck, test, or build failures in priority order, keeping each change scoped to the reported breakage.
5. Finish with one full `npm run validate` pass and a concise status report of any remaining risks.

### Validation plan

- `npm run validate`
- narrower reruns as needed: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`

### Risks

- The current parse failures may be masking deeper contract drift from the merged branches, especially around graph and demo surfaces.
- Once lint is green, typecheck or build may expose additional incompatible changes that were not visible during the first pass.
- Build output may still contain Auth0-related warnings or environment-sensitive behavior that needs a separate follow-up slice after the branch is stable again.

## ExecPlan — Validation Hardening Baseline (2026-03-22)

### Objective

Make the shared validation baseline more merge-resistant by catching unresolved conflict markers, tightening existing lint and typecheck checks, and adding smoke coverage for the critical demo and auth routes.

### Demo relevance

This directly protects the three-minute story. If `/` or `/demo` stops rendering, or if a merge leaves hidden repo damage outside the existing unit tests, judges will see instability before they see the thesis.

### Scope

In scope:

- add a repository-level check that fails on unresolved merge conflict markers
- tighten the existing ESLint and TypeScript commands using the current installed toolchain
- add route-render smoke tests for the home auth shell and the `/demo` surface
- strengthen seeded-demo invariant tests where they validate lineage alignment cleanly
- update repo docs so the stricter gate is easy to run locally and in CI

## ExecPlan — Wave 2 Provider Action Boundary (2026-03-22)

### Objective

Implement the provider-backed external action layer for Wave 2 so Calendar availability reads, Gmail draft preparation, and send-email execution all flow through one explicit Auth0-mediated boundary with stable structured result envelopes.

### Demo relevance

This strengthens the middle of the core demo path:

1. Google is connected through Auth0 Token Vault
2. child agents can reach real or honestly structured external action paths
3. draft and send remain visibly separate
4. provider disconnection or execution blocking stays legible instead of collapsing into vague "auth failed" states

It also supports the seeded scenario: "Prepare my investor update for tomorrow and coordinate follow-ups."

### Scope

In scope:

- extend the shared action contracts with stable provider-result envelopes and action-specific payloads
- implement Google-backed action wrappers for calendar availability read, Gmail draft creation, and send-email execution
- keep send execution intentionally separate from draft creation
- reuse the existing Auth0 session and Google connection shell so provider state remains visible and load-bearing
- surface disconnected, pending, unavailable, failed, and execution-blocked provider outcomes with human-readable messages
- adapt the home auth shell to consume the new result envelopes
- add focused tests that prove result-shape stability and provider-state handling

Out of scope:

- local Warrant authorization decisions
- branch revocation or warrant-engine checks
- full approval UI or approval persistence
- graph UI integration
- additional providers beyond Google

### Files/modules likely affected

- `PLANS.md`
- `README.md`
- `src/contracts/action.ts`
- `src/contracts/index.ts`
- `src/actions/*`
- `src/connections/google.ts`
- `src/app/page.tsx`
- `src/components/auth-shell/auth-shell.tsx`
- `src/demo-fixtures/auth-shell.ts`
- `tests/*`

### Invariants to preserve

- Keep Auth0 and Token Vault visibly load-bearing for external provider access.
- Keep provider access concerns separate from local Warrant policy and approval-state decisions.
- Keep Gmail draft and Gmail send as distinct capabilities and execution paths.
- Return explicit, strongly typed envelopes rather than UI-shaped ad hoc objects.
- Degrade honestly when Auth0 config, provider connection, token access, or live provider execution is unavailable.

### Implementation steps

1. Extend the shared action contracts with explicit provider-result states, failure codes, and action-specific payload types for calendar, draft, and send.
2. Refactor the Google action layer around a provider boundary that first resolves connection or delegated-token readiness, then either executes the live request or returns an honest non-success envelope.
3. Implement the three Wave 2 wrappers:
   - calendar availability read
   - Gmail draft preparation
   - Gmail send execution boundary with explicit execution-release input
4. Update the auth shell page and component to render provider-backed result envelopes directly so other layers can consume the same shapes.
5. Add focused tests for disconnected, unavailable, execution-blocked, and success envelopes using injected fetch stubs instead of real network calls.
6. Run lint, typecheck, test, and build, plus a targeted wrapper exercise in the current env as far as the sandbox and local Auth0 config allow.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Focused execution checks:

- provider wrappers return `disconnected` when Google is not linked
- send wrapper returns `execution-blocked` without explicit release
- calendar and draft wrappers produce stable `success` envelopes with mocked provider responses
- homepage compiles while consuming the new provider-result shapes

### Risks

- Real Google API execution still depends on valid Auth0 connected-account state and outbound network access, so local verification may stop at honest unavailable or disconnected envelopes.
- The existing auth shell UI was built around readiness snapshots, so adapting it to richer envelopes could expose layout assumptions that need a later polish pass.
- Gmail send is intentionally separated from approval logic here; the later approval-track integration must provide the explicit execution release without collapsing boundaries.

Out of scope:

- new linting ecosystems or heavy test dependencies
- browser E2E automation in the shared baseline
- production monitoring or deployment checks
- feature work unrelated to validation confidence

### Files/modules likely affected

- `PLANS.md`
- `package.json`
- `README.md`
- `scripts/*`
- `tests/*`

### Invariants to preserve

- Keep the validation stack dependency-light and based on the repo’s current npm, ESLint, TypeScript, Vitest, and Next.js tooling.
- Keep `/demo` renderable without real Auth0 configuration.
- Keep auth-shell fallback behavior explicit when Auth0 is not configured.
- Add checks that improve merge confidence without forcing a broad refactor of working code.

### Implementation steps

1. Probe stricter lint and TypeScript options against the current codebase before changing scripts.
2. Add a small repository script that fails when unresolved merge conflict markers remain in tracked source-like files.
3. Tighten `lint`, `typecheck`, and `validate` to include the stronger checks without introducing new dependencies.
4. Add smoke tests that render the demo and auth-shell routes to static markup and assert critical seeded content is present.
5. Extend fixture tests with a small lineage-alignment invariant and rerun the full baseline.

### Validation plan

- `npm run check:merge-conflicts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run validate`

### Risks

- Route-render tests are still not a substitute for full browser-based demo rehearsal.
- Stricter TypeScript unused-code checks may surface additional cleanup work as more branches merge.
- The merge-conflict scan intentionally focuses on source-like files, so binary or generated artifacts remain out of scope.

## ExecPlan — Wave 2 Contracts-Sync Stabilization (2026-03-22)

### Objective

Stabilize one shared contract path for Wave 2 so provider actions, orchestration, audit/timeline, approvals, graph binding, and demo fixtures can integrate against explicit DTOs and result envelopes without reaching into deep domain shapes.

### Demo relevance

This is merge-risk reduction work for the core three-minute story. The graph, blocked-overreach proof, approval state, and audit trail all need to describe the same lineage-aware scenario with low coupling before real orchestration and provider adapters land.

### Scope

In scope:

- audit the current Wave 1 shared contracts and identify duplicated, conflicting, or demo-fixture-local DTO ownership
- consolidate graph node, graph edge, warrant summary, action-attempt, approval-state, and timeline-event DTO ownership into one clear shared contract path
- define a small shared graph-view bundle and demo-example bundle if consumers already need them
- add a structured provider action result envelope contract for later real adapters to return instead of arbitrary objects
- update adapter helpers so fixtures and UI consumers map through explicit boundaries
- reduce duplicate or conflicting types where that can be done without invasive rewrites

Out of scope:

- orchestration implementation
- provider API execution
- warrant-engine behavioral redesign
- new providers or broader architecture refactors
- persistence changes

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/*`
- `src/demo-fixtures/*`
- `src/app/demo/page.tsx`
- `src/components/foundation/foundation-shell.tsx`
- `src/graph/*`
- `tests/*`

### Invariants to preserve

- Keep domain models separate from display models.
- Keep the graph fed by graph DTOs, not raw warrant state.
- Preserve the current seeded scenario and visible lineage story.
- Prefer additive adapters and aliases over large renames that would increase merge conflict risk.
- Keep contracts product-facing, small, explicit, and easy to inspect.
- Do not introduce orchestration or provider logic in this slice.

### Implementation steps

1. Move any shared view-bundle or example-set types that still live in `src/demo-fixtures` into `src/contracts` so there is one canonical DTO path.
2. Add explicit DTO aliases or canonical names for graph-focused consumers where that improves Wave 2 readability without forcing a disruptive rename.
3. Define a structured provider action result envelope in `src/contracts/action.ts` and align current provider-path helpers to return that envelope shape.
4. Refactor demo-fixture adapters and UI consumers to import shared DTOs from `src/contracts` and keep fixture logic limited to mapping functions.
5. Remove or reduce duplicate type definitions and add targeted tests that lock the shared contract path and adapter outputs.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

### Risks

- The current graph UI still owns local revoked-state mutations, so contract cleanup must not break the visible branch-revocation demo behavior.
- Action-path helpers are currently UI-oriented placeholders; introducing a result envelope should stay minimal so later provider work can extend it instead of replace it.
- There is already a Wave 1 shared-contract layer, so this pass must stabilize and clarify it rather than create a second parallel contract system.

## ExecPlan — Deterministic Planner-To-Child Orchestration (2026-03-22)

### Objective

Implement the main Warrant orchestration slice for “Prepare my investor update for tomorrow and coordinate follow-ups.” using the real warrant engine, deterministic task decomposition, and provider-action adapters that stay separate from raw provider plumbing.

### Demo relevance

This is the core of Milestone 3 and the clearest proof of the thesis before overreach, approval, and revocation. Judges need to see the planner issue narrower child warrants, the child agents do useful but limited work, and the resulting lineage show up in graph and timeline views.

### Scope

In scope:

- deterministic planner flow for the investor-update scenario
- planner-owned root warrant plus narrower Calendar and Comms child warrants
- one allowed calendar read action through a provider-action interface
- one allowed comms draft action through a provider-action interface
- lineage-aware action and warrant records compatible with shared graph, timeline, and display contracts
- deterministic test coverage and repeat-run stability checks for the seeded flow

Out of scope:

- forbidden overreach action handling beyond preserving compatibility with later integration
- approval-request creation for send-email
- branch revocation behavior
- generic workflow engines, model-driven planning, or extra agent types
- direct UI rendering logic inside orchestration modules

### Files/modules likely affected

- `PLANS.md`
- `src/agents/*`
- `src/actions/*`
- `src/contracts/*`
- `src/demo-fixtures/*`
- `tests/*`

### Invariants to preserve

- Child warrants can only narrow parent authority and must be issued through the real warrant-core logic.
- Meaningful actions must preserve root request, warrant id, parent warrant id, and acting agent identity.
- Orchestration must stay deterministic and demo-friendly; no uncontrolled planning or provider behavior.
- Provider execution must be invoked through interfaces/adapters, not by importing raw provider plumbing into agents.
- Output must remain consumable by graph/timeline/display layers without ad hoc UI-only transforms.

### Implementation steps

1. Inspect existing warrant issuance, authorization, demo fixture, and action-path code to identify reusable contracts and gaps.
2. Define a narrow orchestration model for the seeded investor-update scenario, including deterministic task decomposition and planner-to-child role mapping.
3. Add provider-action interfaces plus deterministic calendar and comms adapters that can execute one allowed action each without leaking provider-specific internals into the agents layer.
4. Implement planner orchestration that issues real child warrants, invokes child action execution through the adapters, and emits lineage-aware warrants, action attempts, and timeline records.
5. Rebuild the seeded main scenario from the orchestration output and keep display/view-model helpers consuming the shared contracts.
6. Add targeted tests for warrant narrowing, action lineage, adapter routing, and repeated-run stability before running the broader validation set.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- repeat the deterministic scenario assertions multiple times within tests or a targeted orchestration spec to confirm stable output across runs

### Risks

- The current shared contracts do not yet include orchestration-specific execution metadata, so new types may be needed if the existing display shape proves too narrow.
- The action layer already has Auth0-path helpers for connection readiness; the new execution adapters must not blur those concerns or duplicate policy logic inconsistently.
- Replacing static demo fixtures with generated scenario data could expose latent assumptions in the demo UI or tests that currently rely on hard-coded ids or ordering.

## ExecPlan — Wave 2 Graph Binding To Shared State (2026-03-23)

### Objective

Bind the delegation graph UI to the real shared Wave 2 state surfaces so graph nodes, edges, and node details are derived from orchestration, warrant, approval, and provider-action outputs instead of graph-local assumptions.

### Demo relevance

This is directly on the core three-minute path. The graph is the main proof artifact for delegated authority, blocked overreach, approval-gated actions, and branch revocation. If the graph is not reading the same state as the rest of the product story, the thesis becomes less credible.

### Scope

In scope:

- audit and use the shared Wave 2 contract surfaces from `src/contracts/*`
- bind the graph from real scenario state produced by the current orchestration path
- extend the graph-facing display DTOs only where needed to carry truthful node status and detail data
- map warrant, action, approval, and provider-state signals into stable graph node and edge state
- support the graph statuses needed for the demo: active, blocked, pending approval, revoked, expired, denied
- keep the existing graph component surface and stable layout behavior
- update node-detail rendering so it reflects real status, capability, expiry, and recent status context
- add targeted tests for the new binding logic and state transitions

Out of scope:

- redesigning the graph UI
- broad warrant-engine redesign
- replacing the deterministic seeded scenario with live provider execution
- full approval UX or persistence changes beyond reflecting current shared state
- deep new graph interactions beyond the existing selection and revoke affordances

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/display.ts`
- `src/contracts/demo.ts`
- `src/actions/provider-adapters.ts`
- `src/actions/execution.ts`
- `src/demo-fixtures/display.ts`
- `src/demo-fixtures/state.ts`
- `src/components/graph/*`
- `src/graph/*`
- `src/app/demo/page.tsx`
- `tests/*`

### Invariants to preserve

- Keep the graph shallow, stable, and demo-legible.
- Keep domain-to-view translation in explicit adapters instead of scattering warrant internals through presentational components.
- Keep the graph fed by shared DTOs/contracts, not graph-local mock data.
- Preserve the existing graph component prop surface where practical.
- Keep branch revocation visually obvious and limited to the selected branch and descendants.
- Do not conflate Auth0/provider-state concerns with local warrant authorization; reflect both honestly when present.

### Implementation steps

1. Extend the shared graph/display DTOs only where needed so node status and detail panels can represent real action, approval, and provider context without reaching back into raw domain models.
2. Update action execution records to retain the structured policy/provider status needed by the graph-binding layer.
3. Refactor the display adapter that builds graph data so it derives node status from the latest relevant warrant, action, approval, and provider signals in the shared scenario state.
4. Keep the current stable node/edge layout logic, but update graph nodes, edges, and node details to consume the richer DTOs and distinct status treatments.
5. Add targeted tests covering active, blocked, pending approval, revoked, expired, and denied graph states plus node-detail accuracy.
6. Run lint, typecheck, test, build, then run the app locally and verify the graph remains readable and visually stable when rendered from the bound state.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run dev -- --port 3000`

Manual scenario checks:

- `/demo` renders the graph from the shared scenario state
- node details show capabilities, purpose, expiry, and status reason from shared DTOs
- approval-required or denied state changes are reflected on the affected branch without layout drift
- revoke interaction still clearly marks the branch and descendants

### Risks

- The current deterministic orchestration output does not yet persist full live provider envelopes, so the binding layer may need semi-live fields that represent Wave 2 provider status without overfitting to today’s demo state.
- The graph currently mutates revoked presentation state locally; keeping that demo interaction while staying truthful to the shared data boundary needs care.
- Adding richer detail DTOs may expose assumptions in the existing node-detail panel or demo page proof-point cards that were safe with the older, narrower summaries.

Focused checks:

- Comms draft action succeeds without needing send approval
- Comms send path is locally eligible but not execution-ready before approval
- the seeded approval request includes exact preview, recipients, blast radius, and Auth0-specific reason text
- approved state flips execution readiness while denied, unavailable, and error stay blocked
- `/demo` renders the approval surface and state model in a way that is legible for the demo

### Risks

- The repo does not yet have a real approval backend, so the demo must stay honest that this slice is deterministic and UI-modeled rather than callback-driven.
- Changing the Comms child warrant to include local send eligibility could blur the earlier “draft-only” story if the UI copy does not clearly explain that approval is still required for execution.
- Adding more approval metadata may expose existing display-contract assumptions in the demo route or tests that currently only expect simple pending approval records.

## ExecPlan — Sensitive Send Approval Flow (2026-03-23)

### Objective

Implement the Comms Agent sensitive-action approval flow so drafting and sending remain separate, Auth0 is visibly load-bearing for real-world execution, and approval outcome changes whether send can proceed.

### Demo relevance

This is Milestone 5 work and one of the strongest proof points in the three-minute story:

1. Comms Agent drafts useful follow-up emails without friction
2. the same branch cannot send just because local Warrant policy allows the category
3. Auth0-backed approval becomes the explicit control surface for live external execution
4. judges can see pending, approved, denied, unavailable, and error states in one legible demo path

### Scope

In scope:

- explicit approval-request and send-approval-state modeling for the Gmail send path
- deterministic seeded scenario updates so Comms drafting and sending are separate but related steps
- a visible send preview surface with recipients, blast radius, and plain-language approval reason
- clear separation between local action eligibility, approval requirement, approval state, and final execution readiness
- demo-surface rendering for not-requested, pending, approved, denied, unavailable, and error states
- focused tests for scenario wiring, approval-state logic, and route rendering

Out of scope:

- real Auth0 approval callbacks or persistence
- new provider integrations beyond Google
- redesigning unrelated graph or auth-shell sections
- branch revocation implementation changes
- broad warrant-engine refactors unrelated to the send-approval story

### Files/modules likely affected

- `PLANS.md`
- `README.md`
- `src/contracts/approval.ts`
- `src/contracts/demo.ts`
- `src/contracts/display.ts`
- `src/contracts/audit.ts`
- `src/approvals/*`
- `src/agents/*`
- `src/demo-fixtures/*`
- `src/app/demo/page.tsx`
- `src/components/graph/*`
- `tests/*`

### Invariants to preserve

- Draft and send must remain distinct capabilities or execution states.
- Local Warrant allow must stay separate from Auth0-backed approval and provider execution.
- Child warrants may only narrow parent authority.
- The flow must stay deterministic and demo-ready without hidden server-only state changes.
- User-facing copy must describe consequences, not OAuth jargon.

### Implementation steps

1. Extend approval contracts with a narrow send-approval state model and an explicit approval request shape that can carry exact preview, recipients, and blast-radius text.
2. Update the deterministic planner scenario so Comms keeps draft capability, gains bounded local send eligibility, and emits a pending send approval request plus a lineage-aware send action that is blocked on approval.
3. Add approval helpers that compute the visible state ladder from `not-requested` through `error`, including when execution becomes ready and when Auth0 is the blocking layer.
4. Render a dedicated approval surface on `/demo` that shows:
   - exact send preview
   - recipients
   - plain-language approval reason
   - blast radius
   - local eligibility vs approval gate vs execution readiness
   - the state ladder for pending, approved, denied, unavailable, and error outcomes
5. Update graph/display adapters and any related node-status rendering needed to keep pending approval legible without conflating it with revocation or policy denial.
6. Add targeted tests, then run the standard repo validation commands.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Focused checks:

- Comms draft action succeeds without needing send approval
- Comms send path is locally eligible but not execution-ready before approval
- the seeded approval request includes exact preview, recipients, blast radius, and Auth0-specific reason text
- approved state flips execution readiness while denied, unavailable, and error stay blocked
- `/demo` renders the approval surface and state model in a way that is legible for the demo

### Risks

- The repo does not yet have a real approval backend, so the demo must stay honest that this slice is deterministic and UI-modeled rather than callback-driven.
- Changing the Comms child warrant to include local send eligibility could blur the earlier “draft-only” story if the UI copy does not clearly explain that approval is still required for execution.
- Adding more approval metadata may expose existing display-contract assumptions in the demo route or tests that currently only expect simple pending approval records.

## ExecPlan — Comms Overreach Proof (2026-03-23)

### Objective

Implement one deep, thesis-proof overreach scenario where the Comms Agent holds a locally send-eligible child warrant for approved Northstar recipients, then attempts a real `gmail.send` action to an out-of-policy external recipient and is denied by the warrant engine before approval logic or provider execution becomes relevant.

### Demo relevance

This is Milestone 4 in its clearest form. It proves that a child agent cannot use a generally send-capable branch to escape its narrower recipient/domain ceiling, and it gives judges a concrete blocked action they can inspect in both the domain model and the demo surface while still preserving a separate approval-required send path for allowed recipients.

### Scope

In scope:

- one deterministic Comms overreach attempt for `gmail.send` to an external recipient outside the child warrant's allowed recipient/domain constraints
- real authorization through the existing warrant engine, not a UI-only guard
- structured denied action data with machine-readable code, human-readable reason, acting agent, and warrant lineage
- timeline/display/graph-friendly propagation of the denied result into the seeded demo scenario
- targeted UI updates that make the denied branch and denial reason legible without redesigning the overall graph screen
- tests covering the exact overreach case and its deterministic scenario output

Out of scope:

- multiple overreach variants in the same slice
- generic permission-management frameworks or broad policy refactors
- approval-flow implementation for allowed sends
- unrelated redesign of the demo page or delegation graph layout
- live provider-send execution changes beyond preserving the existing external-boundary contract

### Files/modules likely affected

- `PLANS.md`
- `src/actions/*`
- `src/agents/*`
- `src/contracts/*`
- `src/demo-fixtures/*`
- `src/components/graph/*`
- `src/graph/*`
- `src/app/demo/page.tsx`
- `tests/*`

### Invariants to preserve

- The denied result must come from real warrant authorization and preserve the two-layer model; the local warrant layer blocks before any external send path is treated as executable.
- Child warrants can only narrow authority, so the Comms child may only send within the parent's approved Northstar recipient/domain ceiling even if the planner/root holds broader Gmail capability.
- The seeded scenario must remain deterministic, with fixed ids, timestamps, recipients, and event ordering.
- Denials must remain structured first and human-legible second so both tests and UI can consume the same result.
- UI binding must stay thin: no hardcoded cosmetic denial that bypasses domain evaluation.

### Implementation steps

1. Extend the action-execution and demo contracts so blocked action attempts retain the underlying authorization denial code, lineage context, and branch attribution needed by display/UI layers.
2. Add a deterministic Comms `gmail.send` overreach execution path that routes through `authorizeAction`, evaluates recipient/domain constraints, emits a blocked action attempt, and produces a timeline-ready denial event without invoking approval or provider send execution.
3. Wire the main scenario to include the overreach attempt after the allowed draft action and before the allowed-but-approval-gated send path, keeping the sequence explicit in the demo fixture.
4. Update display and graph-facing summaries so the blocked Comms branch and its precise policy-denial reason are easy to inspect in the demo page and node detail surface, and remain visually distinct from the later approval-required state.
5. Add an explicit demo-surface proof sequence that shows the policy denial before the later approval-gated allowed send so judges do not have to infer the distinction from raw state.
6. Add targeted tests for the `recipient_not_allowed` or `domain_not_allowed` overreach result, scenario lineage/ordering, node-detail consumption, and demo-surface rendering before running repo validation.

### Validation plan

- `npm run test -- tests/warrant-engine.test.ts tests/agents-orchestration.test.ts tests/delegation-graph.test.ts`
- `npm run test -- tests/warrant-engine.test.ts tests/agents-orchestration.test.ts tests/delegation-graph.test.ts tests/routes.test.tsx`
- `npm run typecheck`
- `npm run build`
- manual verification on `/demo` that the Comms branch shows a blocked send attempt with warrant attribution and a precise reason, and that the denial remains distinct from the later approval-required state instead of collapsing into a disabled-button-only treatment
- route-level render checks that the demo page shows the overreach denial and the later approval gate in one explicit proof sequence

### Risks

- The current graph/detail contracts focus on warrant summaries, so surfacing the blocked action clearly may require careful extension to avoid coupling UI components directly to raw scenario internals.
- Marking the Comms agent as blocked for the overreach beat must not accidentally undermine the earlier successful draft action or muddle later approval/revocation slices.
- The manual `/demo` verification may be limited if local browser/runtime execution is unavailable in this environment, in which case the code and tests can prove the state but not a visual walkthrough.
- If the demo page does not render both the denial and the approval gate explicitly, viewers may still misread the branch as “just pending approval” and miss the proof that policy blocked an earlier attempt.

## ExecPlan — Branch-Specific Comms Revocation (2026-03-23)

### Objective

Implement real branch-specific revocation for the Comms warrant so a user-triggered revoke invalidates that branch and its descendants, records the decision in the canonical scenario history, and leaves the Calendar branch active.

### Demo relevance

This is Milestone 6 and the final core proof beat in the demo:

1. the user deliberately revokes the Comms branch
2. Warrant visibly marks that branch as dead instead of merely hidden
3. later Comms actions fail because of revoked delegated authority
4. Calendar remains active, proving revocation is branch-specific rather than system-wide

It also needs to compose with the already-merged overreach-proof and approval-flow surfaces rather than replacing them.

### Scope

In scope:

- canonical demo-state revocation of the Comms warrant branch
- explicit descendant invalidation using the warrant engine’s revoke path
- revocation records and timeline events attributable to the user action
- a structured post-revoke blocked Comms action that fails because the branch is revoked
- graph and detail-panel rendering that clearly distinguishes revoked from denied and pending-approval
- preserving active Calendar behavior in the same seeded scenario
- low-complexity handling so pending approval on a revoked branch no longer implies executability

Out of scope:

- redesigning the delegation graph layout or overall demo page
- re-implementing approval-flow or overreach-proof logic
- persistence, backend APIs, or multi-user revoke workflows
- generic revoke frameworks beyond the seeded demo path
- unrelated provider integration changes

### Files/modules likely affected

- `PLANS.md`
- `src/agents/main-scenario.ts`
- `src/actions/execution.ts`
- `src/contracts/action.ts`
- `src/contracts/demo.ts`
- `src/contracts/display.ts`
- `src/contracts/audit.ts`
- `src/demo-fixtures/display.ts`
- `src/demo-fixtures/state.ts`
- `src/graph/delegation-graph.tsx`
- `src/components/graph/node-detail-panel.tsx`
- `src/app/demo/page.tsx`
- `tests/agents-orchestration.test.ts`
- `tests/demo-fixtures.test.ts`
- `tests/delegation-graph.test.ts`
- `tests/routes.test.tsx`
- `tests/warrant-engine.test.ts`

### Invariants to preserve

- Revoking a warrant invalidates descendants and must be explicit in both data and UI.
- Revoked, denied, blocked, and pending-approval must remain visually and behaviorally distinct.
- Later Comms failures after revoke must come from real warrant authorization state, not silent UI suppression.
- Calendar branch behavior must remain active and usable after Comms revocation.
- Every revoke and post-revoke failure must preserve lineage and remain visible in history.
- Approval and provider layers must stay conceptually separate from local warrant revocation.
- The seeded demo path must remain deterministic and repeatable.

### Implementation steps

1. Inspect and reuse the existing warrant-engine revoke helper, then define the minimal scenario-state transition needed to apply it to the Comms branch.
2. Extend the deterministic main scenario so it:
   - records the pre-existing overreach and approval beats
   - applies a user-driven Comms branch revocation
   - emits revocation records and timeline entries
   - attempts one later Comms action that fails explicitly because the branch is revoked
   - keeps Calendar active
3. Add a small execution helper for post-revoke blocked actions if needed, reusing `authorizeAction` so the failure reason is structured and lineage-aware.
4. Update display adapters so revoked warrants, revoked-branch approvals, and post-revoke blocked attempts render from shared scenario state instead of graph-local mutation.
5. Replace the graph component’s cosmetic revoke-only state handling with a callback-driven update that uses canonical demo state, while preserving the current layout and node-detail affordance.
6. Update tests for warrant revocation, scenario lineage, graph rendering, and route output, then run repo validation and a manual `/demo` verification if the local app can be started.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- manual verification on `/demo` that:
  - Comms shows revoked status distinctly from denied and pending approval
  - a later Comms action is blocked because the branch is revoked
  - Calendar remains active in the same view
  - revocation and post-revoke failure appear in the timeline with attribution

### Risks

- The current demo route is mostly server-rendered from fixture loaders, so making revocation interactive without forking state between server and client may require careful state hoisting.
- Once Comms is revoked, its existing pending approval needs to stay historically visible without implying the branch can still execute, and that distinction may require small display-contract changes.
- There is no deeper descendant under Comms in the current seeded tree, so descendant invalidation must be explicit in data and tests even if the visible graph branch is shallow.
 
## ExecPlan — Auth0 Foundation Validation Pass (2026-03-23)

### Objective

Run a concrete validation pass on the Auth0 foundation branch so we can separate what is proven live in this worktree from what still depends on a human-completed Auth0 or Google session.

### Demo relevance

This validates the first two core demo beats and clarifies how they connect to the later delegated-action story:

1. user signs in
2. user connects Google through Auth0 Token Vault

It also prevents the demo from overstating what is already real versus what is still staged.

### Scope

In scope:

- verify local env-driven Auth0 runtime behavior in this worktree
- boot the app and exercise login, logout, and Google connect entry points at the route boundary
- inspect the current root shell and the provider-action placeholders it exposes
- verify the deterministic delegation and approval surfaces that currently ship in this branch
- report exact gaps between implemented auth plumbing and true end-to-end provider-backed execution

Out of scope:

- changing product behavior unless testing exposes a clear branch-specific defect
- claiming Google Calendar or Gmail actions executed live without a signed-in delegated session
- claiming the deterministic delegation demo is already driven by real Auth0-backed agent execution

### Files/modules likely affected

- `PLANS.md`
- optional documentation or small fixes only if testing reveals branch-specific issues

### Invariants to preserve

- Auth0-backed external access must remain visibly distinct from local Warrant and approval logic.
- The report must distinguish route-level verification from human-completed browser flows.

### Implementation steps

1. Confirm the active worktree state, env setup, and current auth/provider modules.
2. Run repo-native validation to catch regressions before live route checks.
3. Boot the Next.js app on the expected local port and verify `/`, `/auth/login`, `/auth/logout`, `/auth/connect`, and `/demo`.
4. Inspect whether root-page provider-action panels are real, placeholder, or partially wired.
5. Summarize the entire Auth0 and Google workflow from dashboard configuration through app runtime behavior, with exact verified versus unverified boundaries.

### Validation steps

- `npm run validate`
- `npm run dev -- --port 3000`
- `curl -s -D - -o /dev/null http://127.0.0.1:3000/auth/login`
- `curl -s -D - -o /dev/null http://127.0.0.1:3000/auth/logout`
- `curl -s -D - -o /dev/null "http://127.0.0.1:3000/auth/connect?..."`
- `curl -s http://127.0.0.1:3000`
- `curl -s http://127.0.0.1:3000/demo`

### Risks

- True end-to-end verification still requires an interactive signed-in browser session with the configured Auth0 tenant and Google connected-account flow.
- Route-level success can prove the plumbing is present without proving delegated token retrieval has already succeeded for a real user.

## ExecPlan — Demo Rehearsal Reset And Replay Stability (2026-03-23)

### Objective

Add a deterministic, gated demo rehearsal state path so the merged main scenario can be reset, restored, and replayed without manual repair before recording.

### Demo relevance

This strengthens the full 3-minute story by making the seeded main scenario boringly repeatable. The demo should be able to return to a known-good starting point, recover from stale local state, and replay the core proof moments without requiring code edits or hand-fixing in-memory data.

### Scope

In scope:

- a deterministic loader/reset controller for the merged demo scenario
- one or more stable rehearsal presets derived from the canonical scenario
- graceful recovery when stored demo state is stale, invalid, or half-complete
- a clearly gated demo-only control path for reset/restore actions
- demo-route updates so the rendered surface actually reflects the active rehearsal state
- targeted tests plus repeated manual reset/preset verification

Out of scope:

- a broad admin dashboard or public operator surface
- changing the core warrant, approval, or provider semantics beyond what is required for stable replay
- introducing real persistence or database-backed demo state
- expanding the scenario to new agents, integrations, or proof beats

### Files/modules likely affected

- `PLANS.md`
- `README.md`
- `src/app/demo/page.tsx`
- `src/app/api/demo/*`
- `src/components/*`
- `src/demo-fixtures/*`
- `src/contracts/*`
- `tests/*`

### Invariants to preserve

- The canonical main scenario stays deterministic, with fixed ids, timestamps, recipients, and event ordering.
- Demo tools must stay clearly gated and should not appear publicly unless explicitly enabled.
- Reset and replay helpers must support the existing thesis rather than replace real warrant or Auth0 enforcement with mock-only shortcuts.
- Any derived replay state should remain semantically honest: revocation should come from the warrant engine and approval status should stay legible.
- The demo route must present sensible, legible states even when previously stored demo state is malformed or incomplete.

### Implementation steps

1. Add a small rehearsal-state model around the canonical scenario that can restore the default main path and a minimal set of deterministic replay presets.
2. Back that model with a local demo-state store that reads and writes safely, validates stored state, and self-heals to the canonical preset if the saved state is stale or unusable.
3. Update the demo fixture loader APIs so all graph, timeline, and example consumers resolve from the rehearsal state instead of a process-local singleton only.
4. Add a gated demo-only route handler for reading and switching rehearsal state so resets work from both the browser and terminal.
5. Make the `/demo` route dynamic, derive the visible approval state from the loaded scenario, and add a small gated rehearsal control surface that restores the main scenario and key replay states without becoming an admin UI.
6. Add targeted tests for deterministic reset, preset replay, stale-state recovery, and route/helper gating, then run focused checks followed by the full repo validation gate.

### Validation plan

- `npm run test -- tests/demo-fixtures.test.ts tests/routes.test.tsx`
- `npm run test`
- `npm run typecheck`
- `npm run build`
- repeated manual checks against the demo reset/preset path to confirm `/demo` returns to the canonical known-good state and can switch to the alternate replay state without leftover stale data

### Risks

- File-backed demo state improves rehearsal reliability locally, but it is still demo infrastructure rather than multi-user production persistence.
- If the gated controls are too hidden they will not reduce setup friction; if they are too visible they risk becoming a public admin surface, so the gating needs to stay explicit.
- The current timeline and display contracts are optimized for the canonical scenario, so alternate replay presets must stay narrow to avoid misleading UI states or accidental semantic drift.
- The branch must not claim live Gmail or Calendar execution without direct evidence.

## ExecPlan — Wave 3 To Wave 4 Control-State Taxonomy Normalization (2026-04-02)

### Objective

Normalize control-state semantics across graph status, action records, timeline records, and UI badges/copy so one canonical control-state vocabulary is used consistently, with explicit thin adapters where domain models still need legacy shapes.

### Demo relevance

This is a gate-quality pass between Milestone 4 and Milestone 6 proof moments. Judges must be able to distinguish policy denial, approval gating, approval outcomes, branch revocation, and expiry instantly. Mixed labels like `pending-approval`, `approval-required`, `denied`, and `blocked` weaken legibility and make Wave 3 -> Wave 4 behavior feel contradictory.

### Scope

In scope:

- define one canonical control-state set in one clear shared location:
  - `denied_policy`
  - `approval_required`
  - `approval_pending`
  - `approval_approved`
  - `approval_denied`
  - `blocked_revoked`
  - `active`
  - `revoked`
  - `expired`
- add thin adapter helpers that map existing action outcomes, approval statuses, and warrant/revocation outcomes into canonical control states
- normalize graph node status, action display records, timeline display records, and status badges/copy to canonical states or documented adapters
- keep action-level and node-level semantics separate but aligned (for example, action `approval_required` vs node `approval_pending`)
- update focused tests to assert canonical states and non-contradictory mappings

Out of scope:

- new product features or new scenario beats
- broad contract rewrites that are unrelated to control-state normalization
- redesign of major demo or graph surfaces
- changing core warrant/approval/provider execution behavior
- persistence or backend changes

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/*` (control-state definitions and display contracts)
- `src/demo-fixtures/display.ts`
- `src/components/demo/demo-surface.tsx`
- `src/components/graph/*`
- `src/graph/*`
- `tests/*` (graph, demo fixtures, routes, node detail, orchestration)

### Invariants to preserve

- Blocked overreach remains policy-first and visibly distinct from approval gating.
- Sensitive send remains approval-gated and Auth0-visible.
- Branch revoke remains immediate, branch-specific, and lineage-aware.
- Timeline, graph, and proof cards keep describing the same scenario facts.
- Child warrant narrowing and two-layer enforcement behavior remain unchanged.
- This pass stays surgical and avoids feature churn.

### Implementation steps

1. Add a canonical control-state contract module and export a single vocabulary plus explicit adapter maps.
2. Update display-layer DTOs to carry canonical control states for graph nodes, action records, approval records, and timeline entries.
3. Refactor display adapters to compute canonical control states from existing scenario/action/approval/warrant inputs with deterministic precedence.
4. Update graph and demo UI status rendering helpers so badges and copy consume canonical states (or adapter outputs) instead of mixed legacy labels.
5. Keep any necessary legacy/domain shapes in place, but route them through one documented mapping layer rather than ad-hoc string checks.
6. Update targeted tests for overreach-proof, approval-flow, branch-revoke, control-surface sync points, and audit timeline alignment.
7. Run lint, typecheck, test, and build; then inspect the seeded main scenario outputs for consistent state meaning.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Focused checks:

- graph summaries use canonical control states and keep revoke/expiry/denial/approval states distinct
- action display records distinguish `denied_policy`, `approval_required`, and `blocked_revoked`
- approval records and UI badges map cleanly to `approval_pending`, `approval_approved`, and `approval_denied`
- timeline records expose consistent canonical control-state meaning for blocked, approval, revoked, and active transitions
- `/demo` proof points remain intact and legible without contradictory status labels

### Risks

- Provider-readiness states do not map 1:1 to authority-control states, so adapter decisions must stay explicit to avoid implying policy denial where there is only external readiness delay.
- Existing tests and UI copy assert legacy labels, so normalization may require broad but mechanical expectation updates.
- If status precedence is implemented inconsistently between node summaries and proof cards, the same branch could appear in conflicting states.

## ExecPlan — Wave 4 State-Surface Proof Tests (2026-04-02)

### Objective

Close the Wave 3 -> Wave 4 gate gap by adding explicit, proof-oriented tests that verify required authorization states appear on the real state surfaces and remain behaviorally distinct.

### Demo relevance

This directly strengthens the judge-facing thesis by proving that policy denial, approval gating, and revocation are not collapsed into one generic "blocked" outcome across graph, action/timeline, and UI surfaces.

### Scope

In scope:

- explicit assertions for required states on graph-facing warrant summaries
- explicit assertions for required states on action and timeline display records
- explicit assertions for rendered UI labels/badges (or equivalent rendered text surfaces)
- distinction checks for `denied_policy`, approval-family states, and `blocked_revoked`

Out of scope:

- changing canonical taxonomy names or introducing a new taxonomy model
- broad UI refactors or visual redesign
- snapshot-heavy tests that do not prove behavior

### Files/modules likely affected

- `PLANS.md`
- `tests/delegation-graph.test.ts`
- `tests/demo-fixtures.test.ts`
- `tests/routes.test.tsx`
- `tests/node-detail-panel.test.tsx`
- optional new focused test file under `tests/` for cross-surface state proofs

### Invariants to preserve

- Keep Wave 3.5 canonical mappings as implemented in display adapters and UI formatters; tests must validate those mappings, not redefine them.
- Preserve seeded scenario determinism (fixed ids, timestamps, and event ordering).
- Keep distinction between policy denial, approval requirement/pending/decision, and revoked-branch blocking visible and testable.
- Prefer truthful assertions through real scenario and adapter outputs over isolated implementation-detail checks.

### Implementation steps

1. Review the current canonical mappings in `src/demo-fixtures/display.ts`, timeline metadata, and rendered label formatters used by graph/detail/demo surfaces.
2. Add/extend graph-summary tests to assert presence and distinction for `active`, `revoked`, `expired`, and policy/approval-driven graph states where relevant.
3. Add/extend action/timeline tests to assert explicit records for `denied_policy`, `approval_required`, `approval_pending`, `approval_approved`, `approval_denied`, and `blocked_revoked`.
4. Add/extend UI-render tests to assert user-visible labels/badges distinguish denied-policy vs approval-family vs revoked-blocked outcomes.
5. Keep assertions targeted and semantic (no bulk snapshots), and ensure failures clearly indicate conflated states.

### Validation plan

- `npm run test -- tests/delegation-graph.test.ts tests/demo-fixtures.test.ts tests/node-detail-panel.test.tsx tests/routes.test.tsx`
- `npm run test`
- `npm run typecheck`
- `npm run build`

### Risks

- Some approval variants (notably `approval_denied`) may require scenario mutation in tests because the default seeded path is pending/approved-focused.
- UI route rendering is server-side static in tests; graph-canvas internals are not mounted there, so UI assertions should target rendered labels/badges and detail panels rather than ReactFlow runtime behavior.

## ExecPlan — Wave Label and Presentation Copy Coherence Cleanup (2026-04-02)

### Objective

Remove stale Wave-era labels and tighten demo-facing metadata/copy so the current deterministic Warrant demo is presented coherently without changing product behavior.

### Demo relevance

This is a presentation-cleanup slice for the Wave 3 to Wave 4 gate. Judges should not see outdated Wave labels or contradictory stage language while evaluating the core proof path (delegation, overreach denial, approval gate, and branch revocation).

### Scope

In scope:

- replace stale Wave labels in demo-facing page metadata, navigation labels, and visible explanatory copy
- align auth-shell and demo-surface wording with the current implementation state (deterministic scenario plus Auth0 boundary visibility)
- update README wording where stale Wave references would misrepresent current stage
- update tests that assert stale copy literals

Out of scope:

- any change to warrant, approval, provider, graph, or scenario behavior
- structural UI redesign or broad copy rewrite beyond confusion-prone labels
- new features, new integrations, or new demo steps

### Files/modules likely affected

- `PLANS.md`
- `src/app/demo/page.tsx`
- `src/components/auth-shell/auth-shell.tsx`
- `src/actions/provider-adapters.ts`
- `README.md`
- `tests/routes.test.tsx`

### Invariants to preserve

- Demo flows and enforcement behavior stay unchanged.
- Two-layer separation remains explicit: local Warrant policy vs Auth0-backed external path.
- Delegation graph and approval/revocation semantics remain legible and consistent.
- Copy stays serious, concise, and thesis-aligned.

### Implementation steps

1. Audit all demo-facing `Wave` references and classify which are stale versus historical planning context.
2. Replace stale Wave labels in runtime UI metadata/copy with stage-accurate wording.
3. Update deterministic adapter copy to remove outdated Wave naming while preserving the same semantics.
4. Align README demo-status wording with current implementation state without adding marketing language.
5. Update affected tests for changed text assertions only.
6. Run lint, typecheck, tests, and build; verify no stale Wave labels remain in demo-facing surfaces.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `rg -n "Wave 1|Wave 2|Open Wave" src README.md tests`

### Risks

- Some historical Wave references should remain in planning history; removing too broadly could erase useful archival context.
- Copy tightening can accidentally drift from fixture-backed truth if edits overstate live Auth0/provider execution.

## ExecPlan — Wave 3.5 Scenario Semantic Clarity Cleanup (2026-04-02)

### Objective

Close the final Wave 3.5 blocker by removing ambiguous scenario naming across demo fixtures, rehearsal preset mapping, and developer-facing docs.

### Demo relevance

This is a gate-readiness cleanup for the deterministic 3-minute demo path. Rehearsal operators and future maintainers need to immediately understand which snapshot is pre-revoke (`main`) and which is post-revoke (`comms-revoked`), without reading implementation internals.

### Scope

In scope:

- make scenario helper names reflect real semantics (`main` pre-revoke vs `comms-revoked` post-revoke)
- keep behavior stable by using thin compatibility wrappers where needed
- align preset-to-scenario mapping in code with explicit semantic cues
- update README/developer-facing text so helper names and preset ids map unambiguously
- update tests/imports to follow clearer naming while preserving assertions

Out of scope:

- redesigning demo mode or control surfaces
- changing warrant, approval, provider, or graph behavior
- broad UI/copy rewrites beyond scenario-semantic clarity
- adding new rehearsal presets

### Files/modules likely affected

- `PLANS.md`
- `src/demo-fixtures/scenario.ts`
- `src/demo-fixtures/state.ts`
- `README.md`
- `src/components/demo/demo-surface.tsx`
- `src/components/foundation/foundation-shell.tsx`
- `tests/demo-fixtures.test.ts`
- `tests/delegation-graph.test.ts`
- `tests/state-surface-proof.test.tsx`
- `tests/node-detail-panel.test.tsx`

### Invariants to preserve

- Main scenario remains the pre-revoke approval-gate state.
- Comms-revoked scenario remains the post-revocation state.
- Preset ids stay stable (`main`, `comms-revoked`).
- No product-behavior change in warrants, approvals, revocation, or provider execution.
- Deterministic fixture outputs remain stable.

### Implementation steps

1. Introduce explicit scenario helper naming for post-revocation fixture state and retain a compatibility alias for existing consumers.
2. Keep `createMainDemoScenario()` as the pre-revoke fixture and make the post-revoke derivation naming explicit in code.
3. Update rehearsal state preset mapping and labels so `main` and `comms-revoked` map clearly in code and UI metadata.
4. Update README fixture guidance with explicit helper-to-preset and pre/post-revocation mapping.
5. Update affected imports/usages in components and tests for clarity, preserving behavioral assertions.
6. Run lint, typecheck, test, and build, then verify preset-switch semantics in tests and docs.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test -- tests/demo-fixtures.test.ts tests/delegation-graph.test.ts tests/state-surface-proof.test.tsx tests/routes.test.tsx`

### Risks

- Retaining a deprecated alias for compatibility can still invite accidental usage; docs and internal imports should bias strongly to explicit names.
- Test fixtures that previously used ambiguous helper names may still pass while hiding intent unless import-level clarity is enforced consistently.

## ExecPlan — Wave 3.5 Final Gate Blockers Closure (2026-04-02)

### Objective

Close the last two Wave 3.5 gate blockers with a surgical patch:

1. remove canonical vocabulary leakage in the node-detail approval badge
2. make rehearsal "current state" labeling truthful after in-page revoke mutations

### Demo relevance

This is the final Wave 3.5 gate-hardening slice before Wave 4. During the 3-minute demo, judges must see one coherent state vocabulary and truthful scenario state labels while revocation happens live.

### Scope

In scope:

- update node-detail "Latest approval" badge to render canonical control-state terminology (or a direct truthful adapter)
- preserve approval detail semantics while avoiding raw `pending|approved|denied` surface leakage where canonical control state is expected
- ensure demo controls cannot present stale "main pre-revoke" as current after an in-page revoke mutation
- introduce a minimal local-state truth signal (preset vs modified/custom) without redesigning the rehearsal UI
- add/update focused tests for both regressions

Out of scope:

- graph layout or visual redesign
- broad demo-mode architecture changes
- new presets, new features, or Wave 4 work
- auth/provider flow changes beyond preserving existing semantics

### Files/modules likely affected

- `PLANS.md`
- `src/components/graph/node-detail-panel.tsx`
- `src/components/demo/demo-surface.tsx`
- `src/components/demo/demo-rehearsal-controls.tsx`
- `src/app/demo/page.tsx`
- `src/demo-fixtures/state.ts`
- `tests/node-detail-panel.test.tsx`
- `tests/routes.test.tsx`
- `tests/demo-fixtures.test.ts`
- optional targeted test additions if needed

### Invariants to preserve

- canonical control-state taxonomy remains the source of truth for UI state terms
- main preset remains pre-revoke; comms-revoked preset remains post-revoke
- in-page revoke still revokes only the Comms branch and keeps Calendar behavior intact
- reset/preset switching behavior and deterministic fixtures remain unchanged
- no regression to blocked-overreach, approval, revocation, and timeline proof moments

### Implementation steps

1. Confirm the current node-detail approval badge path and switch it to canonical control-state labeling from the existing display record.
2. Add a minimal rehearsal-control props shape that can represent either preset-backed state or local mutated/custom state.
3. In the demo surface, detect post-load local mutation (specifically in-page revoke path) and pass a truthful state label/description override to rehearsal controls.
4. Keep preset switching/reset behavior unchanged; only adjust labeling truthfulness when local state diverges.
5. Update focused tests for the node-detail approval badge and current-state labeling semantics after revoke.
6. Run lint, typecheck, test, build, and one manual live browser verification path: main preset -> in-page revoke -> truthful label -> reset main -> comms-revoked preset.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- manual browser verification on `/demo` for:
  - main preset load
  - in-page revoke from graph/detail control
  - truthful "current state" labeling after local mutation
  - reset back to main preset
  - comms-revoked preset restore

### Risks

- Because rehearsal metadata is loaded server-side, a client-side local mutation signal must be explicit to prevent stale labels without overhauling data flow.
- Overly generic mutation detection could mark legitimate preset restores as custom; keep mutation state transitions narrow and deterministic.

## ExecPlan — Auth0 Full-Workflow Sync Branch (2026-03-23)

### Objective

Create a clean up-to-date testing branch from current `master`, carry forward any missing auth-shell validation notes, and run a deeper practical validation pass against the latest merged Gmail, Calendar, approval, and delegation surfaces.

### Demo relevance

This closes the gap between the older foundation-only auth shell and the current merged demo path. It validates whether the full story now works as a product, not just as isolated branch slices:

1. user signs in
2. user connects Google through Auth0
3. provider-backed actions become visibly usable
4. delegation, approval, and overreach proof remain legible

### Scope

In scope:

- move the new validation-plan commit onto `master`
- create a fresh testing branch from the latest `master`
- inspect the merged app structure in that branch
- run repo-native validation and local boot checks there
- verify which Gmail, Calendar, approval, and delegation paths are actually implemented versus still simulated
- document exact blockers for any missing true end-to-end external execution

Out of scope:

- broad product refactors unrelated to testing findings
- claiming live Gmail or Calendar execution without direct evidence from the merged branch
- changing tenant or Google dashboard configuration outside what local app testing reveals

### Files/modules likely affected

- `PLANS.md`
- optional docs or small fixes only if the merged testing branch exposes concrete defects

### Invariants to preserve

- Auth0-backed provider access must remain visibly separate from local warrant and approval logic.
- The merged branch should be validated against its real implemented behavior, not the older auth-shell assumptions.
- Report route-level, UI-level, and external-provider-level verification separately.

### Implementation steps

1. Cherry-pick the validation-plan commit onto `master`.
2. Create a new testing branch from updated `master`.
3. Compare the merged branch’s auth, provider-action, approval, and delegation modules against the older foundation shell.
4. Run validation commands and live local route/UI checks.
5. If practical defects are found in the merged branch, fix them in the testing branch with targeted validation.
6. Report exactly what is now truly working end to end and what still depends on manual Auth0 or Google interaction.

### Validation steps

- `git cherry-pick 193e60e`
- `git worktree add /tmp/wt-auth-full-validation -b feat/auth-full-validation master`
- `npm install`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run dev -- --port 3000`
- local HTTP checks for `/`, `/auth/login`, `/auth/logout`, and provider-specific surfaces

### Risks

- The latest merged branch may still rely on deterministic fixtures for parts of the agent or approval story.
- Real provider-backed Calendar and Gmail execution may still require a browser-completed connected-account session that cannot be fabricated from the terminal alone.

## ExecPlan — Auth0 Provider Path Hardening (2026-04-03)

### Objective

Harden the Auth0 and Token Vault provider boundary so the Google access path is robust, honest under failure, and visibly load-bearing for external action execution.

### Demo relevance

This strengthens the first half of the three-minute story and makes the control boundaries inspectable:

1. user signs in
2. user connects Google through Auth0 Token Vault
3. provider-backed calendar/draft/send paths report truthful execution readiness
4. approval and provider execution remain separate gates

### Scope

In scope:

- audit and tighten Auth0 env prerequisites and startup guard behavior
- make provider connection state and provider pathway availability explicit in shell UX
- harden provider action result envelopes for connected/disconnected/pending/unavailable/error paths
- preserve and clarify local policy vs approval vs provider execution boundaries
- strengthen approval and provider send interplay for unavailable/disconnected/provider-failed outcomes
- add or update focused tests and docs for these behaviors

Out of scope:

- replacing deterministic approval storage/callback handling with a production backend
- broad auth architecture redesign beyond targeted hardening
- non-auth feature work unrelated to provider-backed execution boundaries

### Files/modules likely affected

- `src/auth/env.ts`
- `src/auth/session.ts`
- `src/auth/auth0.ts`
- `src/connections/google.ts`
- `src/actions/google.ts`
- `src/contracts/action.ts`
- `src/contracts/connection.ts`
- `src/components/auth-shell/auth-shell.tsx`
- `src/app/page.tsx`
- `tests/auth-shell.test.ts`
- `tests/routes.test.tsx`
- `README.md`

### Invariants to preserve

- Local Warrant policy authorization remains separate from Auth0-backed provider availability.
- Approval requirement remains separate from provider execution availability.
- Draft and send remain distinct paths; send never implies draft and draft never implies send.
- Auth0/Token Vault remains visibly central for external Google actions.
- Failure paths must stay honest and user-legible; no fake success when env or provider path is unavailable.

### Implementation steps

1. Tighten env parsing and startup assumptions so required Auth0 + app base URL prerequisites are explicit and reflected in startup snapshots.
2. Add explicit provider connection metadata and UI rendering for why the current provider state is blocked/pending/unavailable.
3. Harden provider action envelope generation so each action reports consistent structured failures, provider capability state, and next-step guidance.
4. Align Gmail send boundary behavior with approval-release requirements while preserving honest provider failures after release.
5. Update shell copy and state presentation to make Auth0 load-bearing and boundary separation obvious.
6. Expand targeted auth/provider tests for startup, connection states, and provider envelope behavior; update docs for operator clarity.

### Validation steps

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Manual/local checks (if env is available):

- load `/` with missing Auth0 env and verify explicit unavailable state
- load `/` signed-in but disconnected/pending provider path and verify action envelopes remain blocked/pending honestly
- load `/` with provider connected and verify calendar/draft/send envelopes reflect release and provider outcomes distinctly

### Risks

- Auth0 SDK behavior for connected-account token exchange can differ by tenant config; tests must avoid overfitting mocked assumptions.
- Tightening env prerequisites may surface previously hidden local setup gaps; docs must stay aligned to avoid false regressions.
- Additional provider-state explicitness may require updating existing UI and route snapshots that assumed coarser states.

## ExecPlan — Main Scenario Deterministic Coherence Hardening (2026-04-03)

### Objective

Harden the canonical main scenario so planner sequencing, warrant/action lineage, and graph/timeline surfaces stay deterministic and coherent across repeated runs, restored presets, and partially interrupted local state.

### Demo relevance

This directly strengthens the 3-minute core proof path for:

1. planner -> narrower child warrants
2. useful allowed child actions
3. overreach denied by policy
4. sensitive action approval gate
5. branch revoke with immediate authority loss

If these states drift or reorder between runs, the thesis becomes harder to defend live.

### Scope

In scope:

- tighten deterministic scenario construction and transition ordering for main vs comms-revoked states
- add scenario-level integrity checks used by fixture loading and custom-state recovery
- remove fragile implicit assumptions in scenario derivation and display ordering
- keep graph/timeline/action surfaces sourced from coherent canonical state
- add focused tests for repeated-run stability and interrupted-state recovery behavior

Out of scope:

- new product features, agents, or integrations
- workflow-engine abstraction work
- bypassing warrant issuance, approval, or revocation controls
- changing core business semantics for deny vs approval vs revoke

### Files/modules likely affected

- `PLANS.md`
- `src/agents/main-scenario.ts`
- `src/demo-fixtures/scenario.ts`
- `src/demo-fixtures/state.ts`
- `src/demo-fixtures/display.ts`
- `src/contracts/demo.ts` (only if needed for state-contract typing)
- `tests/agents-orchestration.test.ts`
- `tests/demo-fixtures.test.ts`
- `tests/state-surface-proof.test.tsx`
- `tests/delegation-graph.test.ts`

### Invariants to preserve

- Child warrants can only narrow parent authority and are issued through the warrant engine.
- Denied-by-policy, approval-required/pending/resolved, and blocked-by-revoke remain distinct and inspectable.
- Branch revocation remains branch-specific and invalidates descendants.
- Auth0 approval and provider path stay visibly separate from local warrant authorization.
- Canonical scenario ids/timestamps/event ordering remain deterministic.

### Implementation steps

1. Refactor seeded scenario derivation so `main` and `comms-revoked` come from explicit deterministic transitions rather than brittle ad hoc filtering.
2. Add a reusable scenario integrity guard that validates lineage references, required records, and canonical sequencing for stored/preset scenarios.
3. Apply the guard in demo-state load/replace/repair paths so stale or half-progress custom states self-heal to canonical state when invariants are broken.
4. Harden display-layer ordering tie-breakers and summary derivation paths to avoid unstable output when timestamps match.
5. Add targeted tests covering deterministic repeatability, transition coherence, and interrupted-flow recovery.
6. Run lint, typecheck, focused tests, full tests, and build.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/agents-orchestration.test.ts tests/demo-fixtures.test.ts tests/delegation-graph.test.ts tests/state-surface-proof.test.tsx tests/routes.test.tsx`
- `npm run test`
- `npm run build`

Manual checks (if local browser run is available):

- load `/demo` repeatedly on `main` preset and confirm stable proof-point ordering
- trigger in-page Comms revoke and confirm graph/timeline remain coherent
- restore `main` then `comms-revoked` presets and confirm deterministic state reset

### Risks

- Tightening scenario-integrity checks could reject currently tolerated custom demo states, increasing repair frequency (acceptable for deterministic rehearsal goals).
- Refactoring scenario derivation must avoid subtle semantic drift between pre-revoke and post-revoke snapshots.
- If display ordering is changed without consistent tie-breakers across surfaces, graph and timeline could still diverge under equal timestamps.

## ExecPlan — Release Packaging Judge-Facing Documentation Pass (2026-04-03)

### Objective

Produce a judge-friendly README that explains Warrant’s thesis, architecture boundaries, and runnable demo path clearly and accurately, without changing core product behavior.

### Demo relevance

This directly affects how quickly a reviewer can evaluate the 3-minute proof:

1. understand the thesis in under a minute
2. run the app with coherent setup instructions
3. see Auth0 + Token Vault as load-bearing
4. see what the custom Warrant layer contributes beyond OAuth

### Scope

In scope:

- tighten README narrative around problem framing and thesis
- make Auth0 responsibilities explicit and non-incidental
- make Warrant-layer responsibilities explicit and non-overclaimed
- add concise architecture and main scenario walkthrough
- tighten setup, environment, local run, and demo rehearsal instructions
- ensure docs map to currently implemented behavior after Wave 4 hardening

Out of scope:

- new product features or behavior changes
- deep auth/integration rewrites
- adding dependencies or production services
- turning README into a long-form essay

### Files/modules likely affected

- `README.md`
- `PLANS.md` (this ExecPlan entry only)

### Invariants to preserve

- Core thesis remains unchanged: OAuth for apps is insufficient for delegated multi-agent authority.
- Two-layer enforcement remains explicit: local Warrant policy + Auth0-backed provider access.
- No claims that exceed what the current implementation demonstrates.
- Demo path remains centered on the canonical investor-update scenario and branch revocation proof.
- Auth0/Token Vault remains visibly load-bearing, not incidental.

### Implementation steps

1. Audit current README and live code paths (`/`, `/demo`, demo fixtures, validation scripts) for factual grounding.
2. Rewrite README structure to match judge-first flow: thesis, problem, Auth0 role, Warrant role, scenario, architecture, setup/run/demo, project structure.
3. Tighten setup and env instructions to distinguish required vs optional vars and realistic local prerequisites.
4. Add concise demo run instructions aligned to current deterministic presets and revocation behavior.
5. Run documented and baseline validation commands as far as practical; adjust README for accuracy gaps.
6. Do a final brevity/credibility pass to remove vague or inflated language.

### Validation plan

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke:demo`
- `npm run validate`

Manual checks:

- run `npm run dev` and verify `/` and `/demo` load with the documented flow
- verify README setup and demo steps correspond to real routes, scripts, and markers

### Risks

- Auth0 tenant-specific configuration can vary; docs must distinguish local deterministic demo behavior from fully wired provider execution.
- Over-compressing README can remove nuance about approval and provider boundaries; keep wording concise but precise.
- Validation may pass in fixture mode while real external provider execution still depends on Auth0 dashboard setup.


## ExecPlan — Real-Agent Integration Preflight Seams (2026-04-03)

### Objective

Prepare the current merged codebase for the upcoming real-agent runtime wave by identifying and minimally resolving blocking ambiguity in contracts, runtime boundaries, and event/state flow seams.

### Demo relevance

This preflight protects Milestone 3 to Milestone 6 execution quality. It reduces the chance that upcoming planner/child runtime branches introduce regressions in:

1. warrant-gated action execution
2. approval-gated sensitive sends
3. branch revocation and descendant invalidation visibility
4. graph/timeline coherence during live demo transitions

### Scope

In scope:

- inspect merged planner/orchestration-like flow and identify where real runtime should attach
- inspect action/timeline/graph DTO assumptions and detect contract drift that could block runtime integration
- identify conceptual-vs-runtime agent seams and boundary bypass risks
- apply only minimal blocking fixes (no feature expansion)
- add a short implementation note/checklist for follow-on real-agent branches

Out of scope:

- implementing real agent runtime or model/tool orchestration
- adding new product features or broader UX redesign
- refactoring large architecture surfaces
- changing core thesis, provider surface, or demo storyline

### Files/modules likely affected

- `PLANS.md`
- `src/agents/main-scenario.ts`
- `src/contracts/*` (only if a contract-level blocker is confirmed)
- `src/demo-fixtures/*` (only for seam/contract coherence)
- `README.md` or a short note under `docs/` (checklist only)
- targeted tests under `tests/*` tied to the minimal fixes

### Invariants to preserve

- Two-layer enforcement remains explicit: local Warrant policy and Auth0-backed external execution are separate gates.
- Child authority remains narrowing-only, never expanding parent authority.
- Revocation must invalidate descendants and remain visible in graph/timeline/audit surfaces.
- Approval state and policy denial state remain distinct and legible.
- Main and comms-revoked fixture presets remain deterministic and stable.

### Implementation steps

1. Audit the merged orchestration, overreach/approval/revoke logic, graph/timeline derivation, and provider-action boundary to map runtime attach points.
2. Document concrete seam findings, including where agent behavior is currently deterministic fixture logic versus runtime-real.
3. Apply a minimal blocking contract fix only where drift is confirmed to cause integration ambiguity.
4. Add a short in-repo implementation checklist for upcoming runtime branches with explicit attach points and guardrails.
5. Run targeted tests for touched surfaces, then run broader lint/typecheck/test/build validation.
6. Land the work in small reviewable commits aligned to planning, minimal fix, and checklist slices.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/agents-orchestration.test.ts tests/demo-fixtures.test.ts tests/state-surface-proof.test.tsx tests/delegation-graph.test.ts tests/routes.test.tsx`
- `npm run test`
- `npm run build`

Manual checks:

- inspect `/demo` render path and verify main-vs-revoked scenario semantics remain coherent
- confirm provider send boundary remains explicitly gated by execution release
- confirm revocation lineage and timeline references remain internally consistent

### Risks

- Some seam findings may be architectural and intentionally deferred; this pass should avoid over-fixing beyond blockers.
- Contract tightening can break assumptions in tests or fixture mutation helpers if those assumptions were implicit.
- Preflight notes can drift if follow-on branches do not keep the checklist updated.

## ExecPlan — Planner Runtime Actor With Safe Structured Delegation (2026-04-03)

### Objective

Implement a real Planner runtime actor for the main scenario that calls a shared model adapter, emits structured delegation output, validates model output defensively (schema + semantics), retries one repair pass on invalid output, and degrades to a deterministic bounded fallback plan when needed.

### Demo relevance

This strengthens the core 3-minute thesis path by making planner delegation feel real without sacrificing reliability:

1. planner is a runtime actor, not hardcoded task text
2. child delegation is explicitly structured and narrow
3. malformed model output is safely contained
4. fallback remains truthful to bounded delegation

### Scope

In scope:

- add planner runtime entrypoint with role identity and role-specific input/output contracts
- add shared model adapter contract used by planner runtime
- add planner-specific prompt and explicit structured output schema contract
- add schema validation and semantic validation for planner output
- add one repair retry path for malformed/invalid planner output
- add deterministic fallback plan for the canonical investor-update scenario
- emit planner lifecycle and outcome runtime events
- wire planner runtime into scenario orchestration without bypassing warrant issuance/authorization boundaries
- add focused tests for valid, invalid-repair, fallback, and event behavior

Out of scope:

- generic multi-role planning framework
- direct privileged execution by planner runtime
- bypasses around warrant issuance, policy checks, approvals, or provider boundaries
- broad architecture refactors unrelated to planner runtime hardening

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/*` (runtime/model/planner contract additions as needed)
- `src/agents/types.ts`
- `src/agents/main-scenario.ts`
- `src/agents/index.ts`
- `src/agents/*` (new planner runtime + validation modules)
- `tests/agents-orchestration.test.ts`
- `tests/*` (new planner runtime tests)

### Invariants to preserve

- Planner never executes privileged provider actions directly; it only proposes delegation.
- Planner output is never treated as truth before schema + semantic validation passes.
- Child capability requests remain narrower than parent warrant authority.
- Fallback plan for the main scenario grants `calendar.read` and `gmail.draft` only (no direct send authority).
- Warrant engine remains the authority gate for issuing/enforcing warrants.
- Deterministic behavior remains stable for demo rehearsals and repeated test runs.

### Implementation steps

1. Add shared runtime/model adapter contracts and planner runtime types (identity, input shape, structured plan contract, runtime events).
2. Implement planner runtime entrypoint with role-specific prompt/schema contract and model-adapter invocation.
3. Implement planner schema validation and semantic validation against parent authority + bounded role expectations.
4. Add one repair retry path that re-prompts with validation failures and re-validates.
5. Implement deterministic fallback plan for the main scenario when output remains invalid or generation fails.
6. Emit runtime events for started, valid-plan, invalid-output, fallback-used, and failed outcomes.
7. Integrate planner runtime into main scenario orchestration while keeping warrant issuance and action execution boundaries unchanged.
8. Add/update tests for valid path, invalid->repair path, invalid->fallback path, and event traces; then run lint/typecheck/tests/build.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/agents-orchestration.test.ts tests/demo-fixtures.test.ts`
- `npm run test`
- `npm run build`

Scenario checks:

- run planner for main scenario with valid model output and inspect structured delegation plan
- run planner with malformed/semantically-invalid output to confirm repair retry path
- force persistent invalid output to confirm deterministic fallback and emitted events

### Risks

- If semantic rules are too strict, valid model outputs may degrade too often to fallback and reduce realism.
- If semantic rules are too loose, planner could request authority that is technically narrow but behaviorally over-broad.
- Integrating planner runtime into deterministic scenario may unintentionally change existing timeline/task ordering; tests must lock expected ordering.
- New event kinds/typing could require downstream updates where timeline/display assumes a fixed event taxonomy.

## ExecPlan — Runtime Actor Contracts And Stable Event Vocabulary (2026-04-03)

### Objective

Define shared runtime contracts that make Planner, Calendar, and Comms first-class runtime actors with explicit proposal/control/execution boundaries and a stable event vocabulary for graph, timeline, and control-state binding.

### Demo relevance

This is foundational work for Milestone 3 through Milestone 6. It prevents downstream runtime branches from inventing incompatible state labels or event names and protects the demo beats for:

1. planner delegation into child agents
2. approval-gated sensitive sends
3. denied overreach vs revoked-branch failures
4. graph/timeline legibility during live transitions

### Scope

In scope:

- add runtime actor identity and role contracts for planner/calendar/comms
- add runtime state/status vocabulary for actor lifecycle
- add action proposal and proposal-control decision contracts
- add planner plan and explicit planner validation result contracts
- add stable `RuntimeEvent` taxonomy with typed payload envelope
- add agent step result/error contracts suitable for runtime, timeline, and control binding
- add focused contract tests to lock vocabulary and structural invariants

Out of scope:

- provider-specific execution logic
- model adapter/runtime orchestration implementation
- UI rendering or graph layout implementation
- broad framework abstractions beyond shared contracts

### Files/modules likely affected

- `PLANS.md` (this ExecPlan entry)
- `src/contracts/agent.ts`
- `src/contracts/action.ts`
- `src/contracts/control-state.ts` (only if mapping additions are required)
- `src/contracts/index.ts`
- `src/contracts/*` (new runtime contract modules as needed)
- `tests/*` (targeted contract-level tests)

### Invariants to preserve

- Runtime actors are first-class entities with explicit lineage and warrant identity.
- Proposal, approval/control, and execution states remain distinct.
- Status and event vocabularies remain centralized and non-drifting.
- Domain contracts remain separable from display contracts.
- Existing deterministic demo fixtures continue to typecheck and run without behavior changes.

### Implementation steps

1. Add base runtime actor and lifecycle contracts (`AgentRuntime`, `AgentRole`, `AgentRuntimeState`) and keep compatibility aliases where existing modules import current role types.
2. Add proposal/control contracts (`ActionProposal`, `ActionProposalState`, `ProposalControlDecision`) with lineage and warrant identifiers required.
3. Add planner contracts (`PlannerPlan`, `PlannerPlanValidationResult`) with explicit schema-invalid vs semantically-invalid outcomes and machine-readable reason codes.
4. Add first-class runtime event contract (`RuntimeEvent`) with stable category union and typed metadata fields for lineage/control/timeline binding.
5. Add execution result contracts (`AgentStepResult`, error envelopes) and ensure they can encode success, approval-required pauses, policy denial, provider failure, and revoke-driven failures distinctly.
6. Add/update tests that lock role/event/status vocabulary and validation-shape invariants.
7. Run lint/typecheck/tests/build, then commit in reviewable slices matching contract surfaces.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/agents-orchestration.test.ts tests/demo-fixtures.test.ts tests/state-surface-proof.test.tsx`
- `npm run test`
- `npm run build`

### Risks

- Introducing new shared contract exports can break imports in active parallel branches if aliasing/back-compat is not preserved.
- Runtime event taxonomy may be over- or under-constrained; this pass should prioritize stable required categories and avoid speculative expansion.
- Planner semantic validation codes may need tightening once real runtime planner output is wired; keep the first set explicit but minimally sufficient.

## ExecPlan — Real-Agent Model Adapter Guardrails (2026-04-03)

### Objective

Implement a centralized runtime model adapter foundation for real-agent integration using a logical `gemma-4-31b` model, deterministic defaults, strict structured-output validation, and explicit invalid-output failure handling.

### Demo relevance

This enables upcoming runtime-real planner/child-agent work to plug into one reliable invocation path without bypassing policy rigor. It directly strengthens technical execution quality for the demo by preventing freeform model text from becoming runtime truth.

### Scope

In scope:

- add one central runtime-model config surface (provider + model mapping + defaults)
- set logical runtime model to `gemma-4-31b`
- map logical model id to provider model id in one file only
- add one runtime model adapter utility with role-aware invocation
- add standard structured-output invocation path with schema validation
- add one repair retry for invalid structured outputs
- return explicit structured failure after retry exhaustion
- add startup/config checks for missing/invalid model configuration
- ensure local env handling keeps real provider key only in ignored local env

Out of scope:

- planner/calendar/comms runtime orchestration logic
- warrant issuance/enforcement changes
- Gmail/Calendar provider execution changes
- non-demo-critical model experimentation and multi-provider expansion

### Files/modules likely affected

- `PLANS.md`
- `.env.example`
- `.env.local` (local ignored file only)
- `src/agents/index.ts`
- `src/agents/runtime/*` (new runtime-model config/adapter modules)
- `tests/*` (focused runtime-model tests)

### Invariants to preserve

- Do not commit real API keys, provider secrets, or prompt artifacts containing secrets.
- Keep local policy, approval gating, and provider execution boundaries separate from model-output parsing.
- Keep model configuration centralized; no duplicated provider/model ids across modules.
- Model output must never be trusted as runtime truth until schema validation passes.
- Invalid output paths must remain explicit and caller-visible.

### Implementation steps

1. Add the ExecPlan entry and audit current model/provider seam docs and env handling.
2. Introduce a central runtime model config module with env parsing, logical-to-provider model mapping, deterministic defaults, and validation helpers.
3. Add a central runtime model adapter module that supports role-aware invocation and structured-output calls.
4. Implement schema validation, one repair retry max, and structured failure envelopes for invalid outputs.
5. Add focused tests for config validation, successful structured parsing, retry success, and retry-exhausted failure.
6. Update env/example docs placeholders as needed and create local ignored env file for key storage in this worktree only.
7. Run lint, typecheck, tests, and build before final handoff.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Targeted checks:

- missing runtime key/config returns startup/config failure with explicit fields
- logical model `gemma-4-31b` resolves through a single mapping point
- schema-invalid first response triggers exactly one repair retry
- second schema-invalid response returns structured failure result

### Risks

- Exact provider-side model identifier naming for Gemma may differ by SDK/endpoint and can change; mapping must stay centralized and overrideable.
- Real provider invocation depends on valid local API key and network availability, so CI/unit tests should mock invocation transport.
- Tight output guardrails can increase failed calls when prompts are weak; role prompts must stay explicit and schema-driven.

## ExecPlan — Runtime State Binding for Graph/Timeline/Audit (2026-04-03)

### Objective

Bind graph, timeline, and audit-facing presentation contracts to real runtime actor identities, runtime control events, and proposal control decisions so the demo surfaces attribute behavior to actual runtime branches instead of mostly conceptual placeholders.

### Demo relevance

This strengthens the core proof moments in the 3-minute story by making attribution truthful and legible:

1. planner delegates child branches with identifiable runtime actors
2. child proposals move through explicit control states (policy, approval, provider)
3. approvals/denials/revocations/execution results map to branch and warrant lineage in visible UI
4. graph and timeline stay coherent when runtime/control state changes

### Scope

In scope:

- sync this worktree with merged real-agent runtime and control-bridge outputs needed for binding
- add stable runtime-to-presentation adapters (not deep UI coupling)
- map runtime actor identity into graph nodes and node detail surfaces
- map runtime control events and control decisions into timeline/audit display records
- align node/timeline status derivation to runtime/control signals where available
- preserve deterministic scenario readability and existing graph layout
- add or update focused tests covering attribution and status semantics

Out of scope:

- redesigning graph layout or component architecture
- exposing raw runtime internals directly in UI components
- replacing the existing demo scenario narrative or presets
- adding new providers, new agent types, or unrelated auth work

### Files/modules likely affected

- `PLANS.md`
- `src/contracts/demo.ts`
- `src/contracts/display.ts`
- `src/demo-fixtures/display.ts`
- `src/components/demo/demo-surface.tsx`
- `src/components/graph/agent-node.tsx`
- `src/components/graph/node-detail-panel.tsx`
- `src/agents/main-scenario.ts` (only for adapter-fed scenario wiring if required)
- `tests/delegation-graph.test.ts`
- `tests/state-surface-proof.test.tsx`
- `tests/demo-fixtures.test.ts`
- `tests/node-detail-panel.test.tsx`
- `tests/routes.test.tsx`

### Invariants to preserve

- Child warrants only narrow parent authority.
- Revoking a branch invalidates descendants and remains visibly branch-specific.
- Approval state stays distinct from local policy and provider execution readiness.
- Graph/timeline derive from the same canonical scenario state and deterministic ordering.
- Token Vault/provider boundary remains legible; runtime binding must not collapse gates.
- UI remains readable; do not trade legibility for raw-data density.

### Implementation steps

1. Bring in the merged runtime/control-bridge baseline required by this track and verify the branch compiles at baseline.
2. Introduce adapter utilities that map runtime control decisions/events into presentation-level actor/status metadata.
3. Bind graph node and node-detail data paths to runtime actor identity and latest runtime/control state where present.
4. Bind timeline/audit display records to runtime events for proposal, denial, approval, revocation, and execution attribution.
5. Align summary/status labels to runtime/control states while preserving existing serious, compact UI presentation.
6. Add/update targeted tests for graph attribution, timeline attribution, and status semantics.
7. Run lint/typecheck/test/build and perform manual `/demo` scenario inspection for planner/calendar/comms attribution and branch revoke behavior.
8. Commit in small slices:
   - runtime -> graph adapter
   - runtime -> timeline/audit adapter
   - detail/status binding cleanup
   - polish + validation

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run dev -- --port 3000` (manual `/demo` walkthrough)

Manual checks on `/demo`:

- Planner, Calendar, and Comms identities are visible and consistent across graph, detail panel, and timeline.
- Proposal creation, policy denial, approval requested/approved/denied, execution result, and revocation events are attributable to correct agent + warrant + branch.
- Post-revocation behavior still blocks Comms branch while Calendar branch remains readable and intact.

### Risks

- Binding too directly to runtime internals can create brittle UI coupling; adapters must absorb runtime schema changes.
- Merged runtime/control outputs may introduce baseline conflicts with this track branch and require careful reconciliation.
- If timeline status precedence is changed incorrectly, approval and denial states can regress into ambiguous labels.
- Manual browser verification depends on local run environment; if unavailable, confidence will rely on automated tests only.
## ExecPlan — RAI Scenario Runtime Coherence Hardening (2026-04-03)

### Objective

Harden the investor-update scenario after real-agent runtime integration so planner sequencing, child runtime outputs, proposal/control decisions, execution results, and graph/timeline surfaces stay coherent and repeatable across repeated runs.

### Demo relevance

This directly protects the core 3-minute proof path:

1. planner delegates narrower child authority
2. child runtime produces useful outputs and one policy-denied overreach
3. sensitive send proposal waits for control decision
4. execution/result state remains truthful
5. revoke cuts authority immediately without corrupting history

### Scope

In scope:

- run the full investor-update scenario through current runtime-backed scenario builders and inspect sequencing/state drift
- remove fragile sequencing mismatches between canonical runtime stage outputs and in-page scenario mutations
- tighten runtime/control-state consistency so proposal, approval decision, execution, and revoke outcomes remain distinct and ordered
- harden repeatability so preset restore, in-page mutation, and repeated runs do not blur scenario/control state
- add targeted tests for transition coherence and repeated-run integrity

Out of scope:

- new agent features, integrations, or scope expansion
- bypassing runtime-layer execution helpers with static shortcuts
- changing core deny/approval/revoke semantics
- broad UI redesign work

### Files/modules likely affected

- `PLANS.md`
- `src/agents/main-scenario.ts`
- `src/demo-fixtures/scenario.ts`
- `src/demo-fixtures/state.ts`
- `src/components/demo/demo-surface.tsx`
- `tests/agents-orchestration.test.ts`
- `tests/demo-fixtures.test.ts`
- `tests/state-surface-proof.test.tsx`

### Invariants to preserve

- child warrants only narrow from parent authority
- deny, approval, and revoke outcomes remain separate and inspectable
- branch revocation invalidates the branch and descendants immediately
- graph and timeline derive from the same canonical scenario state
- repeated runs of canonical presets are deterministic and stable

### Implementation steps

1. Baseline current runtime flow and state-binding behavior with tests and repeated local scenario construction checks.
2. Align scenario transition sequencing so canonical runtime stage outputs and in-page revoke mutation share consistent ordering and timestamps.
3. Tighten state-binding helpers so custom-vs-preset labeling and persisted state snapshots stay truthful after runtime-driven mutations.
4. Add focused tests for planner->proposal->decision->execution->revoke coherence and repeated-run replay stability.
5. Run lint, typecheck, focused tests, full tests, and build.
6. Commit in small slices: sequencing fixes, state cleanup, repeatability fixes, and final validation/doc updates.

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/agents-orchestration.test.ts tests/demo-fixtures.test.ts tests/state-surface-proof.test.tsx tests/routes.test.tsx`
- `npm run test`
- `npm run build`

Manual checks:

- run main scenario preset repeatedly and confirm stable graph/timeline ordering
- revoke Comms branch in-page, verify control-state truthfulness, then restore presets
- compare in-page revoked custom state behavior against canonical comms-revoked preset for semantic consistency

### Risks

- sequence alignment can accidentally alter expected fixture chronology if timestamps/events are not reconciled carefully
- tightening state-truth rules may mark more local states as custom, which is acceptable but must stay user-legible
- deterministic fixture expectations may require snapshot/test updates if canonical ordering semantics are corrected

## ExecPlan — RAI Complete Verification And Truthfulness Closure (2026-04-07)

### Objective

Run a full verification pass on the merged real-agent-integration wave and close small-to-medium gaps that block a truthful “real runtime architecture complete” claim for planner + child runtime flow.

### Demo relevance

This pass protects the final 3-minute proof path by confirming that the investor-update flow is genuinely runtime-backed and branch-constrained:

1. one central runtime model adapter/config path for Gemma
2. planner, calendar, and comms behave as runtime-distinct actors
3. child runtime outputs drive proposals and control decisions
4. deny/approval/revoke remain separable and auditable
5. graph/timeline attribution references real runtime identities

### Scope

In scope:

- verify checklist A–G against current merged code, tests, and demo path
- tighten model/config truthfulness (central path, env handling, startup failure behavior)
- route scenario orchestration through child runtime actors where missing
- close proposal/control boundary gaps (proposal-created, deny, approval, revoke, provider-ready distinctions)
- ensure graph/timeline attribution surfaces runtime actor identity coherently
- keep deterministic replay stable for repeated main-scenario runs
- add or update focused tests proving corrected behavior

Out of scope:

- broad UI redesign or architecture rewrite
- new product features, new integrations, or stretch scope
- replacing deterministic demo fixtures with uncontrolled live behavior

### Files/modules likely affected

- `PLANS.md`
- `.env.example`
- `src/agents/main-scenario.ts`
- `src/agents/model-adapter.ts`
- `src/agents/runtime/*` (adapter bridge/runtime invocation wiring as needed)
- `src/contracts/demo.ts`
- `src/contracts/display.ts`
- `src/demo-fixtures/display.ts`
- `src/components/demo/demo-surface.tsx`
- `src/components/graph/node-detail-panel.tsx`
- `tests/agents-orchestration.test.ts`
- `tests/child-runtimes.test.ts`
- `tests/delegation-graph.test.ts`
- `tests/node-detail-panel.test.tsx`
- `tests/state-surface-proof.test.tsx`
- `tests/routes.test.tsx`

### Invariants to preserve

- Child warrants only narrow authority from parents.
- Local Warrant policy, approval gating, and provider execution remain separate layers.
- Denied-policy, approval-required/pending/approved/denied, provider-unavailable, and revoked/expired states remain distinct.
- Revoking a branch invalidates descendants immediately and stays visible in scenario state.
- Main and comms-revoked scenarios remain deterministic and repeatable across runs.
- No real secrets are committed; local runtime key belongs only in ignored local env files.

### Implementation steps

1. Baseline the merged RAI flow with targeted tests and code inspection against checklist A–G.
2. Fix model/config truthfulness gaps:
   - remove/avoid duplicate model-adapter paths where they blur “single central adapter” claims
   - verify env placeholder hygiene and explicit startup-invalid behavior
3. Wire child runtime actors into investor-update orchestration so calendar/comms proposals come from runtime outputs, not hardcoded-only proposal construction.
4. Preserve proposal/control/execution boundaries while updating scenario wiring to keep deny, approval, and revoke proof moments intact.
5. Bind runtime identity attribution into display contracts and UI surfaces where it is currently still agent-id-only.
6. Re-run deterministic repeatability checks and adjust fixture/state binding only as needed for coherence.
7. Run full validation, then commit in small slices:
   - model/config verification fixes
   - runtime identity/contract fixes
   - proposal/control truth fixes
   - graph/timeline attribution fixes
   - scenario verification + smoke checks

### Validation plan

- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/runtime-model-adapter.test.ts tests/child-runtimes.test.ts tests/agents-orchestration.test.ts tests/runtime-control-bridge.test.ts tests/delegation-graph.test.ts tests/node-detail-panel.test.tsx tests/state-surface-proof.test.tsx tests/demo-fixtures.test.ts tests/routes.test.tsx`
- `npm run test`
- `npm run build`

Manual checks:

- run `/demo` and verify investor-update path still shows planner -> child -> proposals -> control -> result surfaces
- verify overreach denial remains distinct from approval-required send
- verify post-revoke send stays blocked while calendar branch remains active
- replay main scenario preset repeatedly and confirm no immediate state corruption

### Risks

- Wiring child runtimes into the canonical scenario can shift deterministic timestamps/order if not carefully constrained.
- Tightening runtime identity attribution may require synchronized contract and UI/test updates.
- Startup validation behavior must remain explicit without forcing unrelated routes to hard-fail unexpectedly.
- Full external provider truth still depends on real Auth0 connected-account state; local verification can only prove honest unavailable/error envelopes without a live session.

## ExecPlan — Topology Graph Hardening (2026-04-07)

### Objective

Harden the delegation topology graph into a stable, readable, product-grade proof surface without changing the underlying runtime truth model.

### Demo relevance

This strengthens the most judge-visible artifact for the core demo beats:

1. planner -> child branch delegation is instantly legible
2. denied/approval/revoked/expired states are clearly distinct
3. branch-level revoke remains visibly real
4. repeated runs and state changes do not make the graph jumpy or fragile

### Baseline findings (before implementation)

- Graph tests are currently green, but they do not cover visual overflow/choppiness (`tests/delegation-graph.test.ts`, `tests/node-detail-panel.test.tsx`, `tests/state-surface-proof.test.tsx`).
- Mobile graph view becomes too compressed to read when fitting all nodes.
- Node detail panel has fixed `w-[420px]`, which overflows/clips on mobile when opened.
- Graph selection resets on every graph data refresh because `selectedWarrantId` is cleared in a broad `useEffect` dependency.
- Node cards and spacing bias toward desktop width; readability degrades in constrained widths.

### Scope

In scope:

- stabilize graph layout and viewport behavior across repeated state updates
- reduce node/detail/label overflow in desktop and mobile widths
- improve node sizing and spacing balance while keeping the current graph metaphor
- improve edge readability and status legibility without collapsing distinct states
- improve node detail panel clarity and responsive behavior
- preserve runtime-derived data truthfulness in graph/status rendering

Out of scope:

- redesigning the graph UI from scratch
- adding unrelated new graph features or workflows
- flattening distinct control states into a generic status language
- replacing runtime-driven graph data with mock-only simplifications

### Files/modules likely affected

- `PLANS.md`
- `src/graph/delegation-graph.tsx`
- `src/graph/view-model.ts`
- `src/components/graph/agent-node.tsx`
- `src/components/graph/node-detail-panel.tsx`
- `src/components/demo/demo-surface.tsx` (only if graph wrapper props/layout need narrow adjustments)
- `tests/delegation-graph.test.ts`
- `tests/node-detail-panel.test.tsx`
- `tests/state-surface-proof.test.tsx`

### Invariants to preserve

- Child warrants only narrow authority from parent warrants.
- Revocation remains branch-scoped and descendant-invalidating.
- `active`, `denied_policy`, `approval_pending`, `approval_denied`, `blocked_revoked`, `blocked_expired`, `revoked`, and `expired` remain visually and semantically distinct.
- Graph and timeline continue deriving from the same canonical scenario data.
- Real runtime actor identity and control state attribution remain visible.

### Implementation steps

1. Stabilize graph behavior:
   - preserve selected node across non-destructive graph updates
   - avoid unnecessary view resets/reflows that create choppiness
   - tighten React Flow config for deterministic interaction behavior
2. Harden layout and node readability:
   - rebalance node dimensions, typography, and spacing for dense and narrow viewports
   - tune static graph positioning constants for better branch readability
   - improve edge stroke/marker legibility without changing state semantics
3. Harden responsive overflow surfaces:
   - make node detail panel responsive (mobile-safe width/position)
   - prevent clipping/overflow for long IDs, labels, and status metadata
   - ensure graph overlays/chips/controls do not collide with critical content
4. Validate state visibility and truthfulness:
   - verify status badges/cards keep critical states distinct
   - verify revoked/denied/pending/expired semantics remain explicit in node and detail views
5. Run targeted validation and manual demo checks.
6. Commit in small slices:
   - layout/stability fixes
   - overflow/readability/status/detail-panel hardening
   - tests + final polish/verification

### Validation plan

- `npm run test -- tests/delegation-graph.test.ts tests/node-detail-panel.test.tsx tests/state-surface-proof.test.tsx`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Manual checks:

- desktop `/demo`: graph remains stable when toggling presets and revoking Comms branch
- mobile `/demo`: node cards remain legible, detail panel does not clip off-screen
- status differentiation remains obvious at a glance (`active`, `blocked`, `pending approval`, `revoked`, `expired`, `denied`)

### Risks

- More compact responsive layout can reduce at-a-glance detail unless typography/spacing are tuned carefully.
- Over-constraining React Flow interaction may hurt inspectability if pan/zoom defaults are too strict.
- Visual polish changes can accidentally blur status semantics if badge tone/icon rules drift.

## ExecPlan — Production Start Path Truthfulness Hardening (2026-04-07)

### Objective

Reproduce, diagnose, and fix the `npm run start -- --port 3100` production-start failure (`Cannot find module './vendor-chunks/jose.js'`) with the smallest truthful change.

### Demo relevance

A production-startable repo is demo-critical. Judges and reviewers must be able to run the shared app reliably without dev-mode-only behavior. This strengthens technical execution credibility for the 3-minute story.

### Scope

In scope:

- reproduce the reported failure in a clean command sequence
- capture evidence to classify cause:
  - stale build output
  - dependency/install drift
  - Next.js production artifact issue
  - auth/jose bundling/runtime issue
  - incorrect production start procedure
- apply the smallest grounded fix, or document the clean reproducible procedure if no code fix is required
- verify status of `.playwright-cli/` and `.tmp-npm-cache-playwright/` as ignore-vs-local artifacts

Out of scope:

- graph/UI changes unrelated to startup
- broad dependency churn or framework upgrades
- workaround theater (e.g., replacing production checks with dev-only validation)

### Files/modules likely affected

- `PLANS.md`
- `README.md` (only if startup procedure clarification is needed)
- `.gitignore` (only if local artifact ignore coverage is justified)
- `package.json` (only if start/build script clarification is required)
- minimal auth/runtime files only if the jose artifact issue proves code-level

### Invariants to preserve

- Keep the core demo path and runtime/control semantics unchanged.
- Do not weaken the distinction between local policy, approval, and provider layers.
- Avoid broad refactors; prefer isolated and reviewable changes.
- Do not claim startup success without a successful command-level proof.

### Implementation steps

1. Baseline and reproduce:
   - record current branch/worktree state and relevant script definitions
   - run exact clean sequence for production path and capture failure/success evidence
2. Diagnose:
   - inspect `.next` production artifacts and stack traces around `vendor-chunks/jose.js`
   - test strongest hypotheses with minimal perturbation (artifact freshness, install state, start ordering)
3. Fix minimally:
   - apply smallest code/config/procedure change needed to make production-start truthful
   - avoid touching unrelated graph/demo surfaces
4. Artifact hygiene decision:
   - determine whether `.playwright-cli/` and `.tmp-npm-cache-playwright/` should be ignored in-repo or left as local transient artifacts
   - apply minimal ignore/docs adjustment only if warranted
5. Validate and commit in small slices:
   - reproduction/diagnostic or startup-procedure clarification
   - minimal fix (if required)
   - ignore/cleanup docs tweak (if required)

### Validation plan

- `npm install`
- `npm run build`
- `npm run start -- --port 3100`
- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/delegation-graph.test.ts tests/node-detail-panel.test.tsx tests/state-surface-proof.test.tsx`

If startup behavior is flaky, rerun the production sequence serially and report exact order plus outcomes.

### Risks

- The failure may be nondeterministic and tied to local artifact churn, requiring careful clean-sequence proof.
- `next typegen` and `.next` artifact generation can create race-like symptoms if commands are run in parallel.
- A true Next/Auth0 jose bundling bug may require a workaround that should be documented clearly if not safely fixable in this slice.
