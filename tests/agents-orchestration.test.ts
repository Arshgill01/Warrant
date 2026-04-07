import { describe, expect, it } from "vitest";
import { runMainScenarioPlannerFlow } from "@/agents";

describe("main scenario planner flow", () => {
  it("spawns narrower child warrants and completes the deterministic task plan", () => {
    const run = runMainScenarioPlannerFlow();
    const rootWarrant = run.scenario.warrants.find(
      (warrant) => warrant.id === run.scenario.rootWarrantId,
    );
    const calendarWarrant = run.scenario.warrants.find(
      (warrant) => warrant.id === "warrant-calendar-child-001",
    );
    const commsWarrant = run.scenario.warrants.find(
      (warrant) => warrant.id === "warrant-comms-child-001",
    );

    expect(run.taskPlan).toEqual([
      expect.objectContaining({
        id: "task-calendar-context-001",
        assignedRole: "calendar",
        status: "completed",
      }),
      expect.objectContaining({
        id: "task-comms-draft-001",
        assignedRole: "comms",
        status: "completed",
      }),
      expect.objectContaining({
        id: "task-comms-send-approval-001",
        assignedRole: "comms",
        status: "delegated",
      }),
    ]);
    expect(rootWarrant?.capabilities).toContain("gmail.send");
    expect(calendarWarrant?.capabilities).toEqual(["calendar.read"]);
    expect(commsWarrant?.capabilities).toEqual(["gmail.draft", "gmail.send"]);
    expect(commsWarrant?.resourceConstraints.maxSends).toBe(1);
    expect(calendarWarrant?.parentId).toBe(rootWarrant?.id);
    expect(commsWarrant?.parentId).toBe(rootWarrant?.id);
    expect(run.plannerRuntime.source).toBe("model");
    expect(run.plannerRuntime.events.map((event) => event.kind)).toEqual([
      "planner.started",
      "planner.plan.valid",
    ]);
  });

  it("records draft success separately from send approval gating", () => {
    const run = runMainScenarioPlannerFlow();
    const calendarAction = run.scenario.actionAttempts.find(
      (action) => action.id === "action-calendar-read-001",
    );
    const commsAction = run.scenario.actionAttempts.find(
      (action) => action.id === "action-comms-draft-001",
    );
    const commsOverreachAction = run.scenario.actionAttempts.find(
      (action) => action.id === "action-comms-send-overreach-001",
    );
    const commsSendAction = run.scenario.actionAttempts.find(
      (action) => action.id === "action-comms-send-001",
    );
    const commsApprovedSend = run.scenario.actionAttempts.find(
      (action) => action.id === "action-comms-send-approved-001",
    );
    const commsPostRevoke = run.scenario.actionAttempts.find(
      (action) => action.id === "action-comms-send-post-revoke-001",
    );
    const approval = run.scenario.approvals.find(
      (request) => request.id === "approval-comms-send-001",
    );

    expect(calendarAction).toEqual(
      expect.objectContaining({
        rootRequestId: "request-investor-update-001",
        agentId: "agent-calendar-001",
        warrantId: "warrant-calendar-child-001",
        parentWarrantId: "warrant-planner-root-001",
        outcome: "allowed",
        authorization: expect.objectContaining({
          code: "allowed",
        }),
      }),
    );
    expect(commsAction).toEqual(
      expect.objectContaining({
        rootRequestId: "request-investor-update-001",
        agentId: "agent-comms-001",
        warrantId: "warrant-comms-child-001",
        parentWarrantId: "warrant-planner-root-001",
        outcome: "allowed",
        authorization: expect.objectContaining({
          code: "allowed",
        }),
      }),
    );
    expect(commsOverreachAction).toEqual(
      expect.objectContaining({
        rootRequestId: "request-investor-update-001",
        agentId: "agent-comms-001",
        warrantId: "warrant-comms-child-001",
        parentWarrantId: "warrant-planner-root-001",
        kind: "gmail.send",
        outcome: "blocked",
        authorization: expect.objectContaining({
          code: "recipient_not_allowed",
          blockedByWarrantId: "warrant-comms-child-001",
        }),
      }),
    );
    expect(commsOverreachAction?.outcomeReason).toMatch(/outside its warrant/i);
    expect(commsOverreachAction?.approvalRequestId).toBeUndefined();
    expect(commsOverreachAction?.providerState).toBeNull();
    expect(commsSendAction).toEqual(
      expect.objectContaining({
        rootRequestId: "request-investor-update-001",
        agentId: "agent-comms-001",
        warrantId: "warrant-comms-child-001",
        parentWarrantId: "warrant-planner-root-001",
        outcome: "approval-required",
        approvalRequestId: "approval-comms-send-001",
        authorization: expect.objectContaining({
          code: "allowed",
        }),
      }),
    );
    expect(approval).toEqual(
      expect.objectContaining({
        provider: "auth0",
        status: "approved",
        warrantId: "warrant-comms-child-001",
        affectedRecipients: ["partners@northstar.vc", "finance@northstar.vc"],
        decidedAt: "2026-04-17T09:11:00.000Z",
      }),
    );
    expect(commsApprovedSend).toEqual(
      expect.objectContaining({
        outcome: "allowed",
        approvalRequestId: "approval-comms-send-001",
        providerState: "success",
        authorization: expect.objectContaining({
          code: "allowed",
        }),
      }),
    );
    expect(commsPostRevoke).toEqual(
      expect.objectContaining({
        outcome: "blocked",
        authorization: expect.objectContaining({
          code: "warrant_revoked",
          effectiveStatus: "revoked",
        }),
      }),
    );
    expect(approval?.preview).toEqual(
      expect.objectContaining({
        actionKind: "gmail.send",
        subject: "Investor update follow-up for April 18",
      }),
    );
    expect(run.scenario.controlDecisions.length).toBeGreaterThan(0);
    expect(run.scenario.runtimeEvents.length).toBeGreaterThan(0);
    expect(
      run.scenario.controlDecisions.find(
        (decision) => decision.actionId === "action-calendar-read-001" && decision.controlState === "executable",
      )?.runtimeActorId,
    ).toBe("runtime-calendar-001");
    expect(
      run.scenario.controlDecisions.find(
        (decision) => decision.actionId === "action-comms-send-001" && decision.controlState === "approval_required",
      )?.runtimeActorId,
    ).toBe("runtime-comms-001");
    expect(
      run.scenario.controlDecisions.filter(
        (decision) => decision.controlState === "proposal_created",
      ).length,
    ).toBe(6);
    expect(
      run.scenario.controlDecisions.some(
        (decision) => decision.controlState === "approval_required",
      ),
    ).toBe(true);
    expect(
      run.scenario.controlDecisions.some(
        (decision) => decision.controlState === "approval_approved",
      ),
    ).toBe(true);
    expect(
      run.scenario.controlDecisions.some(
        (decision) => decision.controlState === "blocked_revoked",
      ),
    ).toBe(true);
    expect(
      run.scenario.controlDecisions.filter(
        (decision) => decision.controlState === "executed",
      ).map((decision) => decision.actionId),
    ).toEqual([
      "action-calendar-read-001",
      "action-comms-draft-001",
      "action-comms-send-approved-001",
    ]);
    expect(
      run.scenario.controlDecisions.some(
        (decision) =>
          decision.actionId === "action-comms-send-001" &&
          decision.controlState === "executed",
      ),
    ).toBe(false);
    expect(run.scenario.timeline.map((event) => event.kind)).toEqual([
      "scenario.loaded",
      "warrant.issued",
      "warrant.issued",
      "warrant.issued",
      "action.allowed",
      "action.allowed",
      "action.blocked",
      "approval.requested",
      "approval.approved",
      "action.allowed",
      "warrant.revoked",
      "action.blocked",
    ]);
    expect(
      run.scenario.timeline.find(
        (event) => event.actionId === "action-comms-send-approved-001",
      ),
    ).toEqual(
      expect.objectContaining({
        approvalId: "approval-comms-send-001",
      }),
    );
    expect(run.scenario.revocations).toEqual([
      expect.objectContaining({
        warrantId: "warrant-comms-child-001",
        cascadedWarrantIds: [],
      }),
    ]);
    expect(run.scenario.agents.find((agent) => agent.id === "agent-comms-001")?.status).toBe("revoked");
  });

  it("stays stable across repeated deterministic runs", () => {
    const first = runMainScenarioPlannerFlow();
    const second = runMainScenarioPlannerFlow();
    const third = runMainScenarioPlannerFlow();

    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });

  it("builds the main pre-revoke stage without approved send or revocation records", () => {
    const run = runMainScenarioPlannerFlow(undefined, { stage: "main" });

    expect(run.scenario.warrants.find((warrant) => warrant.id === "warrant-comms-child-001")?.status).toBe(
      "active",
    );
    expect(run.scenario.approvals).toEqual([
      expect.objectContaining({
        id: "approval-comms-send-001",
        status: "pending",
      }),
    ]);
    expect(
      run.scenario.actionAttempts.some((attempt) => attempt.id === "action-comms-send-approved-001"),
    ).toBe(false);
    expect(
      run.scenario.actionAttempts.some((attempt) => attempt.authorization.code === "warrant_revoked"),
    ).toBe(false);
    expect(
      run.scenario.controlDecisions.some(
        (decision) => decision.controlState === "approval_required",
      ),
    ).toBe(true);
    expect(
      run.scenario.controlDecisions.some(
        (decision) => decision.controlState === "approval_approved",
      ),
    ).toBe(false);
    expect(
      run.scenario.controlDecisions.filter(
        (decision) => decision.controlState === "executed",
      ).map((decision) => decision.actionId),
    ).toEqual([
      "action-calendar-read-001",
      "action-comms-draft-001",
    ]);
    expect(run.scenario.revocations).toEqual([]);
    expect(run.scenario.timeline.map((event) => event.kind)).toEqual([
      "scenario.loaded",
      "warrant.issued",
      "warrant.issued",
      "warrant.issued",
      "action.allowed",
      "action.allowed",
      "action.blocked",
      "approval.requested",
    ]);
  });
});
