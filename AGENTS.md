# AGENTS.md

## Project identity

Project name: **Warrant**

Core thesis:
**OAuth was designed for apps. AI agents need warrants.**

Warrant is a demo-first product that explores a missing authorization model for multi-agent systems:
a human authorizes a root agent, the root agent spawns sub-agents, and each sub-agent receives a narrower, revocable, lineage-aware warrant.

This repo is not building a generic assistant.
This repo is building a sharp, judgeable demonstration of:

- delegated authority for agent trees
- branch-level revocation
- capability ceilings for child agents
- legible downstream consent
- visible use of Auth0 for AI Agents Token Vault

## Hackathon objective

This project is for the **Authorized to Act** hackathon by Okta/Auth0.

Winning criteria to optimize for:

1. Security Model
2. User Control
3. Technical Execution
4. Design
5. Potential Impact
6. Insight Value

The strongest differentiator of this repo is **Insight Value**:
it should clearly demonstrate that flat app-style consent breaks down when agents delegate to other agents.

## Non-negotiable product thesis

The product exists to prove one claim:

**Humans should not merely authorize agent actions.  
They should authorize constrained chains of delegated authority.**

Every major implementation decision should strengthen that claim.

## Demo-first rule

Always optimize for the 3-minute demo path first.

Core demo path:

1. user signs in
2. user connects Google through Auth0 Token Vault
3. planner agent requests a parent warrant
4. planner spawns child agents with narrower warrants
5. delegation tree becomes visible
6. child agents perform limited useful work
7. one child attempts to exceed its warrant and is blocked
8. one sensitive action requests approval
9. user revokes one branch
10. descendants lose authority immediately

If a feature does not strengthen this path, it is lower priority.

## Architecture principles

### 1. Two-layer enforcement

No real action is allowed unless both are true:

- the local Warrant policy allows it
- the Auth0-backed external capability/token path allows it

This is a core invariant.

### 2. Child warrants can only narrow, never expand

A child agent may never receive more authority than its parent.

### 3. Every action must have lineage

Every meaningful action must be attributable to:

- root request
- acting agent
- warrant id
- parent warrant id
- timestamp
- result

### 4. Branch revocation must be real

Revoking a warrant invalidates its descendants.

### 5. Token Vault must feel load-bearing

Do not relegate Auth0 to invisible OAuth plumbing.
The product must visibly demonstrate:

- third-party connection through Auth0
- delegated external access
- approval flow for a sensitive action
- why our custom warrant layer alone is insufficient

### 6. Legibility over jargon

User-facing text should describe real-world consequences, not OAuth jargon.

Bad:

- “This scope permits Gmail access.”

Good:

- “This agent can draft follow-up emails, but cannot send them unless you approve.”

## Current scope

### Must-have integrations

- Google Calendar
- Gmail

### Optional stretch

- Docs agent with folder-limited access
- Auth0 FGA-backed document restrictions

### Must-have agents

- Planner Agent
- Calendar Agent
- Comms Agent

### Optional agent

- Docs Agent

## Technical stack defaults

Preferred stack:

- Next.js
- TypeScript
- Tailwind
- LangGraph JS
- Auth0 for AI Agents
- Postgres or Supabase
- a graph UI library for delegation tree rendering

Keep the codebase strongly typed and modular.

## What to avoid

Do not:

- add many integrations early
- build a generic agent platform
- overcomplicate prompt engineering
- chase infra perfection before demo path works
- add background systems that are not demo-critical
- create large architectural abstractions without immediate payoff
- hide key logic inside opaque utilities

## File and module expectations

Organize code around product boundaries, not vague tech layers.

Expected top-level areas once app code exists:

- auth / connections
- warrants
- agents
- approvals
- actions
- graph / visualization
- audit / ledger
- demo fixtures

Keep warrant issuance and warrant enforcement easy to inspect.

## Warrant model requirements

A warrant is an application-level delegation contract, not a replacement for OAuth.

Every warrant should include:

- id
- parentId
- agent identity
- purpose
- capabilities
- resource constraints
- canDelegate
- maxChildren
- expiresAt
- status

Resource constraints may include:

- allowed recipients
- allowed domains
- max number of sends
- calendar time window
- allowed folder ids

## UX expectations

The best UI artifact in this repo should be the delegation tree.

The tree should make the following instantly understandable:

- who can do what
- who granted it
- what expires when
- which branch is revoked
- what action was denied and why

Keep the UI minimal, serious, and product-grade.

## Approval flow expectations

At least one sensitive action must visibly require user approval.

Ideal MVP sensitive action:

- Comms Agent tries to send an email

The approval screen should show:

- exact action preview
- why approval is needed
- blast radius
- affected recipients
- what happens if approved

## Testing and validation rules

Never claim something was tested unless the exact command was run successfully.

For each substantial implementation step, report:

1. what changed
2. commands run
3. pass/fail status
4. open risks

## Planning rules

Before substantial work:

- read this AGENTS.md
- read PLANS.md
- identify the relevant skill file(s)
- make or update an ExecPlan for any non-trivial task

A task is non-trivial if it:

- spans multiple files
- changes core architecture
- touches auth, warrants, agents, approvals, or graph UI
- is expected to take meaningful time
- has sequencing dependencies

## ExecPlan expectations

An ExecPlan should include:

- objective
- why it matters to the demo
- files/modules expected to change
- constraints/invariants to preserve
- implementation steps
- validation steps
- known risks
- explicit out-of-scope items

## Safety / scope control

Ask before:

- adding a paid dependency
- adding a production service beyond current scope
- changing the product thesis
- broadening the integration surface significantly

Do not delete large working sections unless the task explicitly requires it.

## Success standard

A good result for this repo is not:
“many features”

A good result is:
“A polished, defensible demo that makes judges believe multi-agent authorization needs warrants.”
