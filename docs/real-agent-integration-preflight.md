# Real-Agent Integration Preflight (rai-preflight)

This note captures where the upcoming runtime-real agent layer should attach, and which seams must stay explicit.

## Attach points

- Planner/orchestration entry:
  - `src/agents/main-scenario.ts`
  - Current state: deterministic scenario constructor (fixture orchestration), not runtime agent execution.
  - Next branch attach: replace/augment deterministic task sequencing with runtime planner outputs while preserving warrant issuance path.

- Local warrant enforcement boundary:
  - `src/warrants/authorization.ts`
  - Current state: policy gate for capabilities, constraints, expiry, and revocation.
  - Next branch attach: keep this as mandatory local gate for every runtime action attempt.

- Sensitive send approval boundary:
  - `src/approvals/send-flow.ts`
  - Current state: approval state machine + explicit execution release contract.
  - Next branch attach: runtime send pipeline should consume the explicit `release` contract, not bypass it.

- Provider execution boundary:
  - `src/actions/google.ts`
  - Current state: provider action envelopes and explicit release requirement for `executeSendEmail`.
  - Next branch attach: runtime adapters may call these functions directly, but must preserve structured failure and gate semantics.

- Graph/timeline projection boundary:
  - `src/demo-fixtures/display.ts`
  - Current state: canonical DTO projection (`actionAttempts`, `approvals`, `timeline`, `warrants`) into graph and timeline views.
  - Next branch attach: runtime event/state writers should continue producing these canonical records or explicitly evolve the contract.

## Confirmed seam clarifications from preflight

- `DemoAgent` currently models role/purpose/status metadata, not runtime process identity.
- `runMainScenarioPlannerFlow` is deterministic fixture orchestration; it should not be treated as production agent runtime.
- `src/actions/execution.ts` is scenario-level deterministic execution (for fixture proof points), separate from real provider execution in `src/actions/google.ts`.
- Revocation record semantics are now consistent: `revocations[].cascadedWarrantIds` means descendants only (excludes the root revoked warrant).

## Guardrails for next branches

- Do not collapse local policy denial, approval gating, and provider failure into one generic error.
- Keep `approval-required` action attempts distinct from provider execution outcomes.
- Preserve branch-level revocation behavior and descendant invalidation in action authorization and timeline records.
- Keep graph and timeline derivations fed from the same canonical state payloads.
- Avoid introducing runtime-only DTOs without either:
  - mapping back into existing display contracts, or
  - intentionally versioning the contracts and updating all projections/tests together.

## Minimal readiness checklist

- [ ] Runtime planner output can be mapped to `PlannerTaskRecord` and warrant issuance inputs.
- [ ] Every runtime action attempt produces lineage-complete action records (`rootRequestId`, `warrantId`, `parentWarrantId`, `authorization`).
- [ ] Runtime send path uses approval release (`ExternalActionExecutionRelease`) before provider send.
- [ ] Revocation events and action-blocked events stay distinguishable in timeline (`warrant.revoked` vs `action.blocked`).
- [ ] Graph node status remains derived from canonical control-state mapping, not ad hoc runtime labels.
