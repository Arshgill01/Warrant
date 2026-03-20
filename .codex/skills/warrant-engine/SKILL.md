---
name: warrant-engine
description: Build and modify the Warrant domain model and policy engine for parent-child delegation, capability narrowing, resource constraints, expiry, revocation, descendant invalidation, and action authorization. Use when implementing warrant types, issuance rules, validation logic, denial reasons, lineage metadata, or tests for the core authorization invariants.
---

# Warrant Engine Skill

## Purpose

Use this skill when working on the core Warrant model:

- warrant schema
- parent/child issuance
- capability narrowing
- resource-bound validation
- TTL / expiry
- revocation
- cascade invalidation
- action authorization checks
- lineage-aware audit metadata

This is one of the most important skills in the repo.

The Warrant engine is the product thesis made concrete.

## Project context

Warrant is demonstrating that:
**humans should authorize constrained chains of delegated authority, not just flat app access.**

The Warrant engine is not a replacement for OAuth or Auth0.
It is an application-level delegation model layered on top of Auth0-backed delegated access.

The engine should make it impossible for a child agent to exceed the authority of its parent.

## Use this skill when

Use this skill for any task involving:

- warrant type definitions
- warrant issuance logic
- policy narrowing
- resource constraints
- descendant revocation
- authorization middleware or guardrails
- lineage and event attribution
- validation rules for agent actions

## Core concepts

### 1. Warrant

A Warrant is an application-level delegation contract.

It expresses:

- who the agent is
- what it is allowed to do
- what resources it can touch
- whether it can delegate
- how many children it may create
- how long it remains valid
- where it came from

### 2. Parent-child narrowing

Authority can only narrow as it moves downward.

A child Warrant may:

- keep a subset of parent capabilities
- keep stricter resource bounds
- have a shorter expiry
- have equal or lower maxChildren
- disable delegation even if parent could delegate

A child Warrant may never:

- introduce a new capability not present in the parent
- broaden allowed resources
- outlive the parent
- delegate beyond parent limits

### 3. Two-layer enforcement

No meaningful action should be allowed unless:

1. local Warrant policy allows it
2. the external delegated access path also allows it

The Warrant engine handles layer 1.

### 4. Lineage

Every action should be attributable to:

- root request
- acting agent
- warrant id
- parent warrant id
- timestamp
- result

## Required invariants

These are non-negotiable.

### Invariant A

A child Warrant must never exceed parent authority.

### Invariant B

Revoking a Warrant invalidates its descendants.

### Invariant C

Expired Warrants behave as unusable, even if not manually revoked.

### Invariant D

Authorization checks must be explainable.

A denial should be human-readable:

- capability missing
- recipient not allowed
- Warrant expired
- parent revoked
- max usage reached

### Invariant E

Rules should map to visible product behavior.

Avoid abstract policy logic that does not show up in the demo.

## Recommended data model

At minimum, a Warrant should include:

- id
- parentId
- rootRequestId
- createdBy
- agentName
- purpose
- capabilities
- resourceConstraints
- canDelegate
- maxChildren
- expiresAt
- status
- createdAt
- revokedAt
- revocationReason

A capability list might include:

- calendar.read
- gmail.draft
- gmail.send
- docs.read

Resource constraints may include:

- allowedRecipients
- allowedDomains
- maxSends
- maxDrafts
- calendarWindowDays
- allowedFolderIds

Status values should be simple:

- active
- revoked
- expired
- exhausted

## Recommended implementation shape

Prefer small, inspectable modules over a giant policy file.

A good structure looks like:

- warrant types
- warrant creation
- narrowing / inheritance validation
- status evaluation
- revoke logic
- descendant traversal
- authorization checks
- denial reason formatting
- audit event creation

Keep functions pure where possible.

## Implementation workflow

### Step 1

Define the Warrant type and related enums first.

### Step 2

Implement parent-to-child validation before issuance.

Do not create child Warrants optimistically and “fix later”.

### Step 3

Implement a single action authorization function.

Example shape:

- input: warrant, action, target, current time
- output: allow/deny + structured reason

### Step 4

Implement revocation and descendant invalidation.

Prefer explicit logic over hidden magic.

### Step 5

Add audit/event output alongside authorization decisions.

### Step 6

Add tests for the core invariants.

## Authorization check expectations

Every authorization check should answer:

- is the Warrant active?
- is it expired?
- does it have the requested capability?
- does the target satisfy resource constraints?
- has usage budget been exceeded?
- is the action blocked by ancestry or revocation?

Denials should be structured first, then formatted for UI.

Bad:

- `return false`

Good:

- `{ allowed: false, code: "recipient_not_allowed", message: "This agent may only email approved recipients." }`

## What to optimize for

Optimize for:

- correctness
- inspectability
- debuggability
- demo clarity
- deterministic behavior

Do not optimize for:

- theoretical completeness
- premature generalization
- fancy policy DSLs
- over-abstract domain frameworks

## Common mistakes to avoid

Do not:

- merge external auth checks into local Warrant logic
- let children inherit broad raw permissions by default
- encode business rules in UI components
- hide denial reasons
- rely on timestamps without clear comparison rules
- make revocation behavior implicit or hard to trace

## Minimum proof cases

Any substantial Warrant-engine implementation should be able to prove:

1. parent can issue narrower child
2. child cannot gain new capability
3. child cannot outlive parent
4. revoked parent invalidates child
5. disallowed recipient is blocked
6. expired Warrant is denied
7. denial reason is readable
8. action event includes lineage

## Validation guidance

At minimum, validate with:

- automated tests for core policy behavior
- one integration-style path showing planner -> child -> action
- one blocked overreach attempt
- one revoked branch

Never claim policy behavior works without concrete test cases or an explicit runnable scenario.

## Done definition

A Warrant-engine task is done when:

- the relevant invariant is enforced in code
- the behavior is testable
- denial reasons are inspectable
- lineage is preserved
- the result strengthens the demo path
