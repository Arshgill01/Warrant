---
name: execplan-rules
description: Plan substantial work in the Warrant repo with small, demo-first execution slices. Use when a task spans multiple files, touches core architecture, affects auth, warrants, agents, approvals, graph UI, persistence, or has non-trivial validation and sequencing requirements. Apply this skill to create or update ExecPlans that preserve invariants, define scope, and require concrete validation.
---

# ExecPlan Rules Skill

## Purpose

Use this skill whenever planning substantial work in this repo.

This skill defines:

- when an ExecPlan is required
- what an ExecPlan must contain
- how to scope implementation slices
- how to keep work aligned with the demo and thesis

This skill is about planning discipline, not project management theater.

## Project context

Warrant is a thesis-driven demo product.
That means planning quality matters.

Poor planning here causes:

- scope creep
- weak Token Vault visibility
- overbuilt abstractions
- underbuilt demo path
- fragile execution late in the timeline

## When an ExecPlan is required

Create or update an ExecPlan for any task that:

- spans multiple files
- affects architecture
- touches auth, warrants, agents, approvals, graph UI, or persistence
- has sequencing dependencies
- is non-trivial to validate
- could consume meaningful time

Do not skip planning for core product work.

## When an ExecPlan can be lightweight

Small, isolated changes may use a compact plan when they:

- affect one small component
- do not change architecture
- are easy to validate
- are obviously within an existing milestone

Even then, note:

- objective
- files touched
- validation

## What every ExecPlan must include

Every non-trivial ExecPlan should include:

1. Objective  
   What is being built or changed.

2. Demo relevance  
   Why this matters to the 3-minute story.

3. Scope  
   What is in and out.

4. Files/modules likely affected  
   Be concrete.

5. Invariants to preserve  
   State the relevant AGENTS/PLANS constraints.

6. Implementation steps  
   Ordered, realistic, small enough to execute.

7. Validation plan  
   Commands, checks, scenarios.

8. Risks  
   Honest open issues or fragility.

## Preferred planning style

Prefer:

- small vertical slices
- demo-first sequencing
- visible user value early
- explicit acceptance criteria
- honest risk accounting

Avoid:

- giant vague plans
- speculative architecture work
- hidden assumptions
- “implement everything” planning

## Sequencing rule

Build in this order unless there is a strong reason otherwise:

1. demo-critical path
2. proof of enforcement
3. approval / control
4. polish
5. stretch features

A feature that is impressive but not demo-critical should usually wait.

## Slice sizing guidance

A good execution slice should:

- produce a visible product improvement
- preserve existing demo path
- be independently testable
- have a clear stop point

Examples of good slices:

- define Warrant schema and add narrowing validation
- render static delegation tree from mock data
- wire Google connection status into UI
- add blocked recipient check for Comms Agent
- implement revoke-one-branch behavior

Examples of bad slices:

- build the full platform foundation
- generalize all agent types up front
- design future plugin architecture
- add many providers before first demo path works

## Planning questions to answer before implementation

Before starting substantial work, answer:

- What exact demo beat does this strengthen?
- What invariant could this accidentally violate?
- Is Auth0 visibly load-bearing here?
- Is there a smaller slice that proves the same point?
- How will we validate this concretely?

## Acceptance criteria guidance

Acceptance criteria should be behavioral, not vague.

Bad:

- “Auth works”
- “Graph improved”
- “Warrants implemented”

Good:

- “User can connect Google and see connected status in the app”
- “Child Warrant cannot include capability absent from parent”
- “Revoking Comms node disables its later actions without affecting Calendar node”

## Validation rules

Every ExecPlan must define how work will be validated.

Validation should include one or more of:

- exact commands
- manual scenario steps
- screenshots or UI checks
- automated tests
- repeated demo run-throughs

Never claim success without evidence.

## Risk handling

ExecPlans should call out:

- unstable dependencies
- approval-flow fragility
- graph rendering complexity
- provider integration uncertainty
- scope creep risks

Being honest about risks is a strength.

## Reporting expectations after execution

After a substantial task, report:

1. what changed
2. commands run
3. pass/fail status
4. open risks

This should be consistent across major work.

## Common mistakes to avoid

Do not:

- start coding without identifying the relevant milestone
- plan broad infrastructure for hypothetical future needs
- create plans that ignore the demo
- bury risky assumptions
- call something complete without validation
- expand scope because a task feels “nearby”

## Done definition

Planning is done when:

- the task is scoped tightly
- the demo relevance is clear
- invariants are named
- validation is concrete
- risks are explicit
- the plan is small enough to execute without confusion
