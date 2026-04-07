import { describe, expect, it } from "vitest";
import {
  ACTION_PROPOSAL_STATE_SET,
  AGENT_ROLE_SET,
  AGENT_RUNTIME_STATE_SET,
  PLANNER_PLAN_VALIDATION_CODE_SET,
  PLANNER_PLAN_VALIDATION_STATUS_SET,
  PROPOSAL_CONTROL_DECISION_SET,
  RUNTIME_CONTROL_STATE_SET,
  RUNTIME_EVENT_TYPE_SET,
} from "@/contracts";

describe("runtime contract vocabulary", () => {
  it("locks runtime agent roles to planner, calendar, and comms", () => {
    expect(AGENT_ROLE_SET).toEqual(["planner", "calendar", "comms"]);
  });

  it("keeps runtime lifecycle states stable and explicit", () => {
    expect(AGENT_RUNTIME_STATE_SET).toEqual([
      "starting",
      "running",
      "awaiting_input",
      "awaiting_approval",
      "blocked_policy",
      "blocked_revoked",
      "completed",
      "failed",
      "revoked",
    ]);
  });

  it("keeps proposal, control, and execution states distinct", () => {
    expect(ACTION_PROPOSAL_STATE_SET).toEqual([
      "proposed",
      "policy_denied",
      "approval_required",
      "approval_pending",
      "approval_denied",
      "execution_ready",
      "executing",
      "execution_completed",
      "execution_failed",
      "revoked",
    ]);

    expect(PROPOSAL_CONTROL_DECISION_SET).toEqual([
      "approved",
      "denied",
      "approval_required",
      "revoked",
    ]);

    expect(RUNTIME_CONTROL_STATE_SET).toEqual([
      "proposal_created",
      "denied_policy",
      "approval_required",
      "approval_pending",
      "approval_approved",
      "approval_denied",
      "executable",
      "executed",
      "execution_failed",
      "blocked_revoked",
      "blocked_expired",
      "provider_unavailable",
    ]);
  });

  it("locks runtime events required for graph, timeline, and control bindings", () => {
    expect(RUNTIME_EVENT_TYPE_SET).toEqual([
      "agent_started",
      "agent_completed",
      "agent_failed",
      "planner_plan_created",
      "planner_plan_invalid",
      "proposal_created",
      "proposal_denied",
      "approval_required",
      "approval_resolved",
      "execution_completed",
      "execution_failed",
      "branch_revoked",
    ]);
    expect(new Set(RUNTIME_EVENT_TYPE_SET).size).toBe(RUNTIME_EVENT_TYPE_SET.length);
  });

  it("supports schema-invalid and semantically-invalid planner plan validation", () => {
    expect(PLANNER_PLAN_VALIDATION_STATUS_SET).toEqual([
      "valid",
      "schema_invalid",
      "semantically_invalid",
    ]);
    expect(PLANNER_PLAN_VALIDATION_CODE_SET).toEqual(
      expect.arrayContaining([
        "unknown_role",
        "capability_incompatible_with_parent_warrant",
        "missing_required_child_role",
        "unusable_task_decomposition",
      ]),
    );
  });
});
