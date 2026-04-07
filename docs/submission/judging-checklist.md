# Warrant — Judging Framing

## What judges should notice first

1. This is not a generic assistant demo. It is an authorization model demo.
2. Auth0/Token Vault handles external delegated access; Warrant handles local delegation chains.
3. Deny, approval, and revoke are distinct and visible in both graph and timeline.

## Criteria mapping

### Security Model

- Child warrants can only narrow parent authority.
- Resource constraints are explicit (recipients, domains, windows, usage caps).
- Overreach attempts are denied with concrete policy codes.
- Branch revocation invalidates descendant authority immediately.

### User Control

- Sensitive Gmail send is approval-gated with exact action preview.
- Blast radius is visible before approval.
- User can revoke one branch without disabling unrelated branches.

### Technical Execution

- Deterministic scenario fixtures and rehearsal presets (`main`, `comms-revoked`).
- Runtime actor attribution is preserved across actions and timeline events.
- Graph, proof cards, and timeline are projected from shared canonical scenario state.

### Design

- Delegation graph is legible and branch-oriented.
- State surfaces explain "what happened" and "what comes next" in demo order.
- Policy denial, approval gating, and revocation block have distinct visual and language treatments.

### Potential Impact

- Applies to any AI product where one user-approved root agent delegates to sub-agents.
- Improves least-privilege and incident containment for agentic workflows.

### Insight Value

- Core insight: flat app consent breaks under delegated multi-agent fan-out.
- New claim demonstrated: humans should authorize constrained chains of delegated authority, not only root-agent actions.

## Suggested judging walkthrough (fast)

1. Open `/demo`.
2. Confirm Planner -> Calendar + Comms delegation.
3. Confirm Comms overreach is policy-denied.
4. Confirm sensitive send is approval-gated.
5. Revoke Comms branch or load `comms-revoked`.
6. Confirm post-revoke Comms action is blocked while Calendar remains active.

