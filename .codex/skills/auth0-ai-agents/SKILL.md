---
name: auth0-ai-agents
description: Integrate Auth0 for AI Agents into Warrant, especially sign-in, provider connection state, Token Vault-backed delegated access, and sensitive-action approval flows. Use when implementing or fixing Auth0 login, Google connection UX, Gmail or Calendar access paths, approval states, or any code that must make Token Vault visibly load-bearing rather than incidental.
---

# Auth0 for AI Agents Skill

## Purpose

Use this skill when working on:

- Auth0 login
- provider connection flows
- Token Vault usage
- delegated third-party access
- async approval / sensitive action flow
- external action execution that depends on Auth0
- clear separation between local Warrant policy and Auth0-backed access

This skill exists to make sure Auth0 is visibly load-bearing in the product.

## Project context

The project thesis is about Warrants, but the hackathon requirement is explicit:
the project must use **Token Vault**.

That means Auth0 cannot feel incidental.
It must be clear in both implementation and demo that:

- third-party provider access is handled through Auth0
- agents do not hold broad long-lived credentials directly
- sensitive external actions use a real approval flow
- our custom Warrant layer alone is not enough

## Use this skill when

Use this skill for any task involving:

- sign-in
- user session
- provider connection UI
- Token Vault integration
- Gmail / Calendar delegated access
- approval flow for sending email
- external action execution
- auth-related environment setup
- auth-related error handling

## Primary goals

### 1. Make Token Vault visibly essential

The UI and architecture should clearly show that Google access is connected and mediated through Auth0.

### 2. Keep auth logic separate from Warrant logic

Local policy decides whether an action is allowed in principle.
Auth0 decides whether the external delegated path is available.

### 3. Make the approval flow memorable

At least one action should clearly require approval before it can execute.

The preferred MVP action is:

- Comms Agent sending an email

## Required product narrative

The user should be able to understand:

1. “I connected my Google account through Auth0.”
2. “The Planner and its child agents can only use delegated access that I connected.”
3. “Even if the local Warrant allows an action category, sensitive real-world actions still need approval.”
4. “Without Auth0, the product could not safely perform external actions in this way.”

## Architecture expectations

Keep the following boundaries clear:

### Boundary A — Local Warrant policy

This answers:

- should this agent be allowed to try this action?

### Boundary B — Auth0-backed external access

This answers:

- does the app currently have the delegated access needed to perform this action?

Do not collapse these into a single “auth” blob.

## Core implementation responsibilities

This skill is responsible for:

- sign-in flow
- provider connection state
- user-visible connection status
- token-backed access to Gmail and Calendar
- external API action wrappers
- approval handoff for sensitive actions
- handling disconnected / expired / denied cases

## Expected MVP external capabilities

### Must-have

- connect Google account
- read Google Calendar data
- draft Gmail content or create draft-equivalent flow
- request approval before send action
- send only after approval

### Optional

- richer provider metadata
- multiple Google accounts
- docs-related provider integration

## UI expectations

The product should include:

- connected provider status
- whether Google access is available
- a visible difference between draft and send
- a visible approval state for sensitive actions
- useful error messaging when external access is unavailable

Bad UI copy:

- “OAuth scope missing”

Good UI copy:

- “Google access is not connected, so this agent cannot use Gmail yet.”

## Auth flow principles

### Principle 1

Use real provider connection flow early.

Avoid mocking provider state too long.

### Principle 2

Make connection state queryable and renderable.

The app should know:

- connected
- not connected
- pending
- expired or invalid
- approval required
- approved
- denied

### Principle 3

Approval is part of the product story, not a hidden implementation detail.

The user should see:

- the exact action being approved
- why approval is needed
- what happens after approval

## Sensitive action rules

Treat these as sensitive in MVP:

- sending email
- any action with external recipients
- any action that leaves draft-only mode

Even if local Warrant says `gmail.send`, the product may still require approval based on risk.

That is desirable.
It strengthens the demo.

## Error handling expectations

External auth failures should be understandable.

Examples:

- provider not connected
- delegated access unavailable
- approval denied
- approval pending
- token retrieval failed
- action execution failed after approval

Always distinguish:

- policy denied by Warrant
- unavailable delegated access
- approval not granted
- external API execution failure

## Implementation workflow

### Step 1

Get sign-in and provider connection working before deeper agent flows.

### Step 2

Create small external action wrappers:

- get calendar availability
- create or prepare email draft
- send email

### Step 3

Ensure each wrapper returns useful, structured results.

### Step 4

Wire the sensitive action approval flow.

### Step 5

Expose provider and approval states in the UI.

## Common mistakes to avoid

Do not:

- bury Auth0 integration behind generic service wrappers too early
- make external actions indistinguishable from simulated local actions
- skip the visible provider-connected state
- treat approval as a backend-only detail
- mix Warrant denial and provider-access denial in one generic error

## Validation guidance

At minimum, validate:

1. user can sign in
2. user can connect Google
3. calendar read path uses real delegated access
4. comms draft path uses real delegated access or real provider-backed state
5. send action cannot complete without approval
6. approval result affects action outcome
7. disconnected provider state is visible and handled

Never claim Auth0 is “fully integrated” unless the external path has been exercised end-to-end.

## Done definition

An Auth0-related task is done when:

- the app visibly uses Auth0 for the relevant external access path
- the user can understand connection state
- the action path distinguishes local policy from delegated external access
- sensitive approval is clear, not hidden
- the result strengthens the hackathon story
