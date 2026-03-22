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
    ]);
    expect(rootWarrant?.capabilities).toContain("gmail.send");
    expect(calendarWarrant?.capabilities).toEqual(["calendar.read"]);
    expect(commsWarrant?.capabilities).toEqual(["gmail.draft"]);
    expect(commsWarrant?.capabilities).not.toContain("gmail.send");
    expect(calendarWarrant?.parentId).toBe(rootWarrant?.id);
    expect(commsWarrant?.parentId).toBe(rootWarrant?.id);
  });

  it("records lineage-aware allowed child actions for calendar and comms work", () => {
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
          code: "capability_missing",
          blockedByWarrantId: "warrant-comms-child-001",
        }),
      }),
    );
    expect(commsOverreachAction?.outcomeReason).toMatch(/does not allow gmail\.send/i);
    expect(run.scenario.timeline.map((event) => event.kind)).toEqual([
      "scenario.loaded",
      "warrant.issued",
      "warrant.issued",
      "warrant.issued",
      "action.allowed",
      "action.allowed",
      "action.blocked",
    ]);
    expect(run.scenario.agents.find((agent) => agent.id === "agent-comms-001")?.status).toBe(
      "blocked",
    );
  });

  it("stays stable across repeated deterministic runs", () => {
    const first = runMainScenarioPlannerFlow();
    const second = runMainScenarioPlannerFlow();
    const third = runMainScenarioPlannerFlow();

    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });
});
