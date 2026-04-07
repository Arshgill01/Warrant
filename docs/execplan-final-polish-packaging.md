# ExecPlan — Final Polish + Submission Packaging (2026-04-07)

## Objective

Complete final product-flow polish and submission/narrative packaging for the `feat/final-polish-packaging` branch in ordered, low-risk subpasses, without changing core runtime architecture or adding new product features.

## Demo relevance

This pass is the final judge-facing tightening for the 3-minute proof. It improves:

1. flow coherence during the investor-update scenario
2. explainability of deny vs approval vs revoke moments
3. repo readability and evaluator onboarding speed
4. submission/blog/demo-script quality and factual alignment

## Scope

In scope:

- Subpass 1: main-flow polish for `/demo` pacing, sequencing, transitions, and explanatory clarity
- Subpass 2: release packaging updates to README/setup/run/demo guidance
- Subpass 3: submission assets (Devpost-ready copy, judging framing, screenshot notes)
- Subpass 4: Auth0 community blog draft with deeper technical framing
- Subpass 5: final 3-minute demo script + recording checklist/fallbacks
- consistency pass to keep wording/state labels aligned across product + docs

Out of scope:

- deployment/infrastructure/release ops
- new runtime architecture or major orchestration rewrites
- new product features/integrations/agents
- changing AGENTS.md, skills, or PLANS.md

## Files/modules likely affected

- `docs/execplan-final-polish-packaging.md` (this plan)
- `src/components/demo/demo-surface.tsx`
- `src/components/demo/demo-rehearsal-controls.tsx` (if sequencing cues need tightening)
- `src/graph/delegation-graph.tsx` (only graph-adjacent explanatory framing)
- `tests/routes.test.tsx`
- `tests/state-surface-proof.test.tsx` (if visible strings/markers change)
- `README.md`
- `docs/submission/devpost-project-description.md` (new)
- `docs/submission/judging-checklist.md` (new)
- `docs/submission/screenshot-captions.md` (new)
- `docs/blog/oauth-for-apps-ai-agents-need-warrants.md` (new)
- `docs/demo/final-3-minute-script.md` (new)

## Invariants to preserve

- child warrants only narrow parent authority
- deny, approval, execute, revoke, and expiry remain distinct states
- branch revocation remains immediate and descendant-invalidating
- Auth0/Token Vault remains visibly load-bearing for external provider path
- no claims beyond implemented behavior
- no deployment work in this branch

## Ordered implementation steps

### Subpass 1 — Main flow polish

1. Audit current `/demo` narrative order and identify friction/transition seams.
2. Tighten on-screen framing for:
   - planner decomposition
   - child role activity
   - draft creation
   - denied overreach
   - approval-required send
   - branch revoke
3. Add concise “what happened / what next” cues where missing.
4. Improve coordination language between main area, graph, timeline, and approval surface.
5. Run targeted tests and manual walkthrough.
6. Commit in two slices:
   - flow audit + pacing fixes
   - state/result clarity + proof-moment staging

### Subpass 2 — Release packaging

1. Update README for judge-first comprehension and truthful scope.
2. Tighten setup, run, validation, and demo instructions.
3. Ensure Auth0 role vs Warrant role is explicit and non-overlapping.
4. Validate commands and route markers.
5. Commit docs packaging changes.

### Subpass 3 — Submission assets

1. Write Devpost-ready project description (distinct from README).
2. Add concise summary, feature bullets, “what this proves,” and “what judges should notice.”
3. Map framing explicitly to hackathon criteria.
4. Add screenshot capture/caption notes.
5. Commit submission assets.

### Subpass 4 — Blog post prize draft

1. Draft technical Auth0-community-focused blog post:
   - flat consent problem
   - Token Vault as substrate
   - Warrant as delegation/control layer
   - concrete product proof moments
2. Run one sharpen pass to remove fluff and increase technical signal.
3. Commit draft and sharpen pass separately.

### Subpass 5 — Demo script + recording notes

1. Produce beat-by-beat 3-minute script with exact screen order.
2. Mark pre-staged vs live steps.
3. Add fallback notes for risky live checks.
4. Keep thesis visible in first 20-30 seconds.
5. Commit script/checklist.

### Final cleanup

1. Cross-check terminology consistency across UI/docs/assets.
2. Run full validation command set.
3. Commit final consistency cleanup.

## Validation plan

After Subpass 1 product changes:

- `npm run test -- tests/routes.test.tsx tests/state-surface-proof.test.tsx tests/delegation-graph.test.ts tests/node-detail-panel.test.tsx`
- `npm run lint`
- `npm run typecheck`

Manual scenario walkthrough (`/demo`):

- confirm clearer sequence and pacing of main investor-update journey
- confirm planner/child activity explanation is explicit
- confirm denied overreach vs approval-required send vs revoked-blocked are clearly different
- confirm graph/timeline/approval surfaces stay coherent during revocation

Before final handoff:

- `npm run test`
- `npm run build`

Docs truthfulness checks:

- verify README/submission/blog/script only claim currently implemented behavior
- verify no deployment instructions were added

## Known risks

- copy tightening can regress tests that assert exact strings; keep targeted tests updated with intent-preserving wording.
- over-editing flow text can create UI density; maintain concise, high-signal language.
- live Auth0/Google readiness still depends on tenant/session state; packaging should distinguish deterministic fixture flow from live-provider checks.

## Commit plan

1. main flow audit + pacing fixes
2. state/result clarity and proof-moment staging
3. README / architecture / setup instructions
4. submission copy / feature bullets / judging framing
5. blog post outline + first draft
6. blog post sharpen pass
7. demo script + recording checklist
8. final cleanup / consistency pass
