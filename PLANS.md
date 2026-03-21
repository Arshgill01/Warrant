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
