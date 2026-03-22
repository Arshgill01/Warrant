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
  });

  it("records draft success separately from send approval gating", () => {
    const run = runMainScenarioPlannerFlow();
    const calendarAction = run.scenario.actionAttempts.find(
      (action) => action.id === "action-calendar-read-001",
    );
    const commsAction = run.scenario.actionAttempts.find(
      (action) => action.id === "action-comms-draft-001",
    );
    const commsSendAction = run.scenario.actionAttempts.find(
      (action) => action.id === "action-comms-send-001",
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
      }),
    );
    expect(commsAction).toEqual(
      expect.objectContaining({
        rootRequestId: "request-investor-update-001",
        agentId: "agent-comms-001",
        warrantId: "warrant-comms-child-001",
        parentWarrantId: "warrant-planner-root-001",
        outcome: "allowed",
      }),
    );
    expect(commsSendAction).toEqual(
      expect.objectContaining({
        rootRequestId: "request-investor-update-001",
        agentId: "agent-comms-001",
        warrantId: "warrant-comms-child-001",
        parentWarrantId: "warrant-planner-root-001",
        outcome: "approval-required",
        approvalRequestId: "approval-comms-send-001",
      }),
    );
    expect(approval).toEqual(
      expect.objectContaining({
        provider: "auth0",
        status: "pending",
        warrantId: "warrant-comms-child-001",
        affectedRecipients: ["partners@northstar.vc", "finance@northstar.vc"],
      }),
    );
    expect(approval?.preview).toEqual(
      expect.objectContaining({
        actionKind: "gmail.send",
        subject: "Investor update follow-up for April 18",
      }),
    );
    expect(run.scenario.timeline.map((event) => event.kind)).toEqual([
      "scenario.loaded",
      "warrant.issued",
      "warrant.issued",
      "warrant.issued",
      "action.allowed",
      "action.allowed",
      "approval.requested",
    ]);
  });

  it("stays stable across repeated deterministic runs", () => {
    const first = runMainScenarioPlannerFlow();
    const second = runMainScenarioPlannerFlow();
    const third = runMainScenarioPlannerFlow();

    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });
});
