---
name: demo-stability
description: Make the Warrant demo deterministic, repeatable, and easy to rehearse. Use when creating seeded scenarios, fixture data, reset helpers, stable state transitions, graceful failure handling, or any code and UX changes that reduce demo risk for the final 3-minute hackathon presentation.
---

# Demo Stability Skill

## Purpose

Use this skill when working on anything that affects:

- demo reliability
- deterministic state
- seeded scenarios
- stable data fixtures
- graceful failure handling
- polished demo flow
- video-recording readiness

This project is hackathon software.
A brilliant idea with a flaky demo loses.

## Project context

The final submission requires:

- a working application link
- a public repo
- a roughly 3-minute demo video

That means the product should not just work “in theory”.
It should work predictably and repeatedly in a narrow, rehearsable path.

## Use this skill when

Use this skill for:

- seeding demo data
- building predictable scenarios
- reducing nondeterminism
- designing fallback states
- preparing video flow
- defining demo fixtures
- improving empty / loading / failure states
- creating demo reset paths

## Demo-first principle

A demo path is more valuable than broad feature coverage.

Always prioritize:

- narrow path
- reliable inputs
- stable outputs
- understandable states
- rehearseable transitions

## Required demo beats

The product must be able to show, reliably:

1. user signed in
2. Google connected
3. parent Warrant approved
4. child agents spawned
5. delegation tree visible
6. useful child action
7. blocked overreach attempt
8. sensitive action approval
9. branch revoke
10. lineage-aware outcome

Every stability decision should support these beats.

## Stability strategy

### 1. Seed the scenario

Use deterministic task copy and predictable fixture data where possible.

Example task:

- “Prepare my investor update for tomorrow and coordinate follow-ups.”

Avoid randomized prompts in the demo.

### 2. Make edge cases explicit

Pending, denied, disconnected, revoked, expired, and blocked states should all render intentionally.

### 3. Prefer constrained realism over uncontrolled realism

The demo should feel real, but not chaotic.

### 4. Reduce moving parts

Every extra integration or dynamic dependency is a risk multiplier.

## Recommended demo controls

The app should eventually support a simple way to:

- reset demo data
- load the default scenario
- clear stale branches
- restore known-good provider state where possible
- inspect latest event history

These do not need to be public-facing features.
A private/demo-only route or admin control is acceptable.

## State management principles

Prefer explicit state transitions over inferred magic.

Important entities should have clear statuses:

- provider connection
- Warrant
- agent node
- action attempt
- approval request
- approval result

That makes recovery and debugging easier.

## Failure handling expectations

Every likely failure mode should have a graceful UI state.

Examples:

- provider not connected
- approval denied
- Warrant revoked
- Warrant expired
- recipient not allowed
- external action unavailable
- branch already revoked

Failure states should not break the whole flow.

## Demo rehearsal rules

Before declaring a demo path ready:

- run it multiple times end-to-end
- verify timing-sensitive states
- verify graph updates
- verify action logs
- verify reset / cleanup path

The demo should be boringly repeatable.

## Common mistakes to avoid

Do not:

- depend on uncontrolled live data where fixtures would do
- leave critical states hidden in console logs
- assume network timing will always cooperate
- tie the demo to too many accounts or providers
- make approval flow timing opaque
- add stretch features before the core path is repeatable

## Validation guidance

A demo-related task is not done until you can answer:

- can this be shown reliably in the 3-minute demo?
- does this reduce risk or increase it?
- can the state be reset?
- can failure be explained clearly if it occurs?

Useful validation tasks include:

- repeated manual run-throughs
- seed/reset script checks
- deterministic fixture loading
- smoke tests for critical pages or routes

## Packaging expectations

Toward the end of the build, this skill should guide:

- demo account preparation
- seed data setup
- script alignment with real product flow
- screenshot capture
- backup plans for fragile steps

## Done definition

A demo-stability task is done when:

- the relevant part of the demo is more repeatable than before
- failure states are intentional
- setup/reset burden is lower
- the path is easier to rehearse and record
