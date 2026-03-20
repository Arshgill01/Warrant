---
name: delegation-graph-ui
description: Build and refine the delegation tree and node-detail experience for Warrant. Use when implementing the visual hierarchy of user, planner, and child agents; showing capabilities, status, expiry, approval, denial, and revocation; or improving the graph so judges can quickly understand who can do what and which branch is blocked or revoked.
---

# Delegation Graph UI Skill

## Purpose

Use this skill when working on:

- the delegation tree / graph
- node cards
- status badges
- lineage display
- revoke controls
- denial visualization
- approval visualization
- event-to-graph synchronization

This is the most important visual artifact in the project.

If this UI feels weak, the entire thesis feels weak.

## Project context

The graph is not a decorative feature.
It is the primary way the product makes the authorization model legible.

A judge should be able to look at the graph and immediately understand:

- who the root actor is
- which child agents exist
- what each child can do
- which branch is revoked
- what action was blocked and why
- what sensitive action is awaiting approval

## Use this skill when

Use this skill for any work involving:

- delegation tree rendering
- node design
- graph layout
- branch revoke interactions
- node detail drawers / side panels
- graph state updates
- badges, legend, status colors
- graph-related demo polish

## Core design goals

### 1. Legibility first

The graph must be readable within seconds.

### 2. Product seriousness

The UI should feel like a real security/productivity product, not a toy visualization.

### 3. Shallow hierarchy

The MVP tree should be shallow.
Do not overcomplicate the graph structure.

### 4. Stable layout

Nodes should not jump around unpredictably during the demo.

## MVP graph structure

Keep the MVP graph simple:

- User
  - Planner Agent
    - Calendar Agent
    - Comms Agent
    - optional Docs Agent

That is enough.

Avoid deeper nesting unless absolutely required.

## Node content expectations

Every node should make the following available:

- node type
- display name
- status
- parent
- primary capabilities
- expiry
- whether it can delegate
- short purpose summary

Statuses should be very visible:

- active
- pending approval
- blocked
- revoked
- expired
- denied

## Minimum interactive affordances

The graph should support:

- selecting a node
- viewing node details
- revoking a branch where applicable
- seeing why a node or action is blocked
- seeing approval state when relevant

A side panel or detail drawer is recommended.

## Recommended visual language

Prefer:

- simple cards
- clean borders
- minimal motion
- compact badges
- status icons
- strong spacing
- readable typography

Avoid:

- excessive animation
- overdesigned security-dashboard cliché visuals
- overly dense text inside nodes
- hidden critical information behind too many clicks

## What the graph must communicate instantly

At a glance, the user should see:

- the Planner created the child agents
- each child is constrained
- Comms is different from Calendar
- one branch can be revoked independently
- a denied or blocked action belongs to a specific branch

## Approval and denial representation

These states matter and should feel distinct.

### Approval pending

Show clearly on the relevant node and action trail.

### Denied by policy

Show that the child tried something it was not allowed to do.

### Revoked

Make it visually obvious that the branch is dead.

A revoked node should look different from an expired node.

## Revoke interaction expectations

Branch revoke should feel deliberate and understandable.

The UI should make it clear:

- what node is being revoked
- whether descendants are affected
- which nodes remain active

Do not make revocation feel like a generic delete button.

## Graph-state modeling guidance

Graph UI should be fed from explicit data, not derived from loosely coupled UI state.

Recommended conceptual inputs:

- node list
- edge list
- current statuses
- selected node
- recent events
- action attempts
- approval state

Keep domain data separate from display formatting.

## Implementation workflow

### Step 1

Design the node card and detail panel before polishing layout.

### Step 2

Get a stable static graph working.

### Step 3

Bind live statuses and capabilities.

### Step 4

Add node selection and detail inspection.

### Step 5

Add revoke interactions.

### Step 6

Add denial and approval states.

### Step 7

Polish spacing, hierarchy, and readability.

## Common mistakes to avoid

Do not:

- overbuild the graph before node information design is solved
- cram too much text into the cards
- rely on color alone for status
- let layout reflow unpredictably
- represent revocation and denial with the same visual treatment
- make the graph the only place where explanations exist

## Validation guidance

The graph is good enough when a new person can answer these questions quickly:

1. Which node is the root?
2. Which node can send email?
3. Which node can only read calendar?
4. Which node is currently blocked or pending approval?
5. What happens if the Comms node is revoked?
6. Why did a denied action fail?

If those answers are not obvious, the graph still needs work.

## Done definition

A graph UI task is done when:

- the relevant information is legible
- the layout is stable
- the graph supports the main demo beats
- revocation and denial are visually clear
- the interface makes the thesis easier to understand
