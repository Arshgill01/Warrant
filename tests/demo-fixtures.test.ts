import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createCommsRevokedDemoScenario,
  createMainDemoScenario,
  getDisplayScenarioExamples,
  revokeCommsBranchScenario,
} from "../src/demo-fixtures";
import { validateDemoScenarioContract } from "../src/demo-fixtures/scenario-contract";
import {
  loadDelegationGraphView,
  loadDemoRehearsalSnapshot,
  loadDemoState,
  loadTimelineEvents,
  replaceDemoState,
  resetDemoState,
  restoreDemoStatePreset,
} from "../src/demo-fixtures/state";

const originalDemoStateFile = process.env.WARRANT_DEMO_STATE_FILE;
const demoStateFile = join(tmpdir(), `warrant-demo-state-${process.pid}.json`);

describe("demo fixtures", () => {
  beforeEach(() => {
    process.env.WARRANT_DEMO_STATE_FILE = demoStateFile;
    rmSync(demoStateFile, { force: true });
    resetDemoState();
  });

  afterEach(() => {
    rmSync(demoStateFile, { force: true });

    if (originalDemoStateFile === undefined) {
      delete process.env.WARRANT_DEMO_STATE_FILE;
      return;
    }

    process.env.WARRANT_DEMO_STATE_FILE = originalDemoStateFile;
  });

  it("creates a deterministic canonical scenario with isolated copies", () => {
    const first = createCommsRevokedDemoScenario();
    const second = createCommsRevokedDemoScenario();

    expect(first).toEqual(second);
    expect(first.taskPrompt).toBe("Prepare my investor update for tomorrow and coordinate follow-ups.");
    expect(first.agents.map((agent) => agent.role)).toEqual(["planner", "calendar", "comms"]);
    expect(first.approvals).toHaveLength(1);
    expect(first.approvals[0]).toEqual(
      expect.objectContaining({
        id: "approval-comms-send-001",
        provider: "auth0",
        status: "approved",
      }),
    );
    expect(first.revocations).toEqual([
      expect.objectContaining({
        warrantId: "warrant-comms-child-001",
      }),
    ]);

    first.user.label = "Changed User";

    expect(second.user.label).toBe("Maya Chen");
  });

  it("covers the required core planner-to-child flow with concrete seeded examples", () => {
    const scenario = createCommsRevokedDemoScenario();
    const examples = getDisplayScenarioExamples(scenario);

    expect(examples.calendarChildWarrant.status).toBe("active");
    expect(examples.calendarChildWarrant.capabilities).toEqual(["Read calendar"]);
    expect(examples.commsChildWarrant.status).toBe("revoked");
    expect(examples.commsChildWarrant.capabilities).toEqual(["Draft email", "Send email"]);
    expect(examples.calendarAction.outcome).toBe("allowed");
    expect(examples.calendarAction.kind).toBe("calendar.read");
    expect(examples.calendarAction.providerState).toBe("success");
    expect(examples.commsDraftAction.outcome).toBe("allowed");
    expect(examples.commsDraftAction.kind).toBe("gmail.draft");
    expect(examples.commsDraftAction.providerState).toBe("success");
    expect(examples.commsOverreachAction.outcome).toBe("blocked");
    expect(examples.commsOverreachAction.kind).toBe("gmail.send");
    expect(examples.commsOverreachAction.authorization.code).toBe("recipient_not_allowed");
    expect(examples.commsSendAction.outcome).toBe("approval-required");
    expect(examples.commsSendApproval.status).toBe("approved");
    expect(examples.commsChildWarrant.latestAction?.id).toBe("action-comms-send-post-revoke-001");
    expect(examples.commsChildWarrant.latestPolicyDenial?.id).toBe(
      "action-comms-send-overreach-001",
    );
    expect(examples.commsChildWarrant.latestPolicyDenial?.authorization.code).toBe(
      "recipient_not_allowed",
    );
    expect(examples.commsChildWarrant.latestApproval?.id).toBe("approval-comms-send-001");
  });

  it("keeps stage-specific scenario contracts valid for main and comms-revoked presets", () => {
    const main = createMainDemoScenario();
    const revoked = createCommsRevokedDemoScenario();

    expect(validateDemoScenarioContract(main, "main")).toEqual({
      ok: true,
      issues: [],
    });
    expect(validateDemoScenarioContract(revoked, "comms-revoked")).toEqual({
      ok: true,
      issues: [],
    });
  });

  it("loads graph and timeline views from the same canonical state and resets safely", () => {
    const snapshot = loadDemoState();
    snapshot.user.label = "Local Only";

    expect(loadDemoState().user.label).toBe("Maya Chen");

    snapshot.agents[0]!.label = "Modified Planner";
    replaceDemoState(snapshot);

    const graphView = loadDelegationGraphView();
    const timeline = loadTimelineEvents();

    expect(graphView.nodes.find((node) => node.id === "warrant-comms-child-001")?.status).toBe("approval_pending");
    expect(graphView.nodes.find((node) => node.id === "warrant-comms-child-001")?.parentId).toBe(
      "warrant-planner-root-001",
    );
    expect(graphView.warrantSummaries.find((summary) => summary.id === "warrant-comms-child-001")?.latestAction?.providerState).toBeNull();
    expect(
      graphView.warrantSummaries.find((summary) => summary.id === "warrant-comms-child-001")?.latestPolicyDenial
        ?.authorization.code,
    ).toBe("recipient_not_allowed");
    expect(timeline.map((event) => event.at)).toEqual([...timeline.map((event) => event.at)].sort());
    expect(timeline.at(-1)?.actionId).toBe("action-comms-send-001");

    resetDemoState();

    expect(loadDemoState().agents[0]?.label).toBe("Planner Agent");
  });

  it("preserves the active preset context when storing a custom scenario snapshot", () => {
    restoreDemoStatePreset("comms-revoked");

    const scenario = loadDemoState();
    scenario.agents[0]!.summary = "Custom planner summary";
    replaceDemoState(scenario);

    const rehearsal = loadDemoRehearsalSnapshot();

    expect(rehearsal.kind).toBe("custom");
    expect(rehearsal.preset).toBe("comms-revoked");
  });

  it("keeps graph, timeline, and warrant summaries aligned to the same scenario lineage", () => {
    const graphView = loadDelegationGraphView();
    const timeline = loadTimelineEvents();
    const warrantIds = new Set(graphView.warrantSummaries.map((summary) => summary.id));

    expect(graphView.nodes).toHaveLength(graphView.warrantSummaries.length);
    expect(graphView.edges).toHaveLength(
      graphView.warrantSummaries.filter((summary) => summary.parentId !== null).length,
    );
    expect(graphView.nodes.every((node) => warrantIds.has(node.id))).toBe(true);
    expect(
      loadDemoState().actionAttempts.every((action) => action.rootRequestId === "request-investor-update-001"),
    ).toBe(true);
    expect(
      timeline.every(
        (event) =>
          event.warrantId === null ||
          warrantIds.has(event.warrantId),
      ),
    ).toBe(true);
    expect(
      timeline.every(
        (event) =>
          event.parentWarrantId === null ||
          warrantIds.has(event.parentWarrantId),
      ),
    ).toBe(true);
  });

  it("applies a branch-specific Comms revocation without collapsing Calendar", () => {
    const revokedScenario = revokeCommsBranchScenario(createMainDemoScenario());
    const commsWarrant = revokedScenario.warrants.find(
      (warrant) => warrant.id === "warrant-comms-child-001",
    );
    const calendarWarrant = revokedScenario.warrants.find(
      (warrant) => warrant.id === "warrant-calendar-child-001",
    );
    const postRevokeAction = revokedScenario.actionAttempts.find(
      (action) => action.id === "action-comms-send-post-revoke-001",
    );

    expect(revokedScenario.revocations).toEqual([
      expect.objectContaining({
        id: "revocation-comms-001",
        warrantId: "warrant-comms-child-001",
        revokedById: "user-maya-chen",
      }),
    ]);
    expect(commsWarrant?.status).toBe("revoked");
    expect(commsWarrant?.revocationReason).toMatch(/Maya revoked the Comms branch/i);
    expect(calendarWarrant?.status).toBe("active");
    expect(
      revokedScenario.agents.find((agent) => agent.id === "agent-comms-001")?.status,
    ).toBe("revoked");
    expect(
      revokedScenario.agents.find((agent) => agent.id === "agent-calendar-001")?.status,
    ).toBe("active");
    expect(postRevokeAction).toEqual(
      expect.objectContaining({
        outcome: "blocked",
        authorization: expect.objectContaining({
          code: "warrant_revoked",
          blockedByWarrantId: "warrant-comms-child-001",
        }),
      }),
    );
    expect(revokedScenario.timeline.map((event) => event.kind)).toContain("warrant.revoked");
    expect(revokedScenario.timeline.at(-1)).toEqual(
      expect.objectContaining({
        actionId: "action-comms-send-post-revoke-001",
        kind: "action.blocked",
      }),
    );
  });

  it("restores the revoked replay preset through the warrant engine", () => {
    restoreDemoStatePreset("comms-revoked");

    const scenario = loadDemoState();
    const rehearsal = loadDemoRehearsalSnapshot();
    const commsAgent = scenario.agents.find((agent) => agent.id === "agent-comms-001");
    const commsWarrant = scenario.warrants.find((warrant) => warrant.id === "warrant-comms-child-001");

    expect(rehearsal.preset).toBe("comms-revoked");
    expect(commsAgent?.status).toBe("revoked");
    expect(commsWarrant?.status).toBe("revoked");
    expect(scenario.revocations).toEqual([
      expect.objectContaining({
        warrantId: "warrant-comms-child-001",
        revokedById: "user-maya-chen",
      }),
    ]);
    expect(scenario.timeline.some((event) => event.kind === "warrant.revoked")).toBe(true);
    expect(scenario.timeline.at(-1)).toEqual(
      expect.objectContaining({
        kind: "action.blocked",
        actionId: "action-comms-send-post-revoke-001",
        warrantId: "warrant-comms-child-001",
      }),
    );
  });

  it("self-heals stale or invalid stored demo state back to the canonical scenario", () => {
    writeFileSync(
      demoStateFile,
      JSON.stringify({
        version: 999,
        kind: "preset",
        preset: "broken",
        scenario: null,
        updatedAt: "2026-04-17T09:00:00.000Z",
      }),
      "utf8",
    );

    const rehearsal = loadDemoRehearsalSnapshot();
    const scenario = loadDemoState();

    expect(rehearsal.preset).toBe("main");
    expect(rehearsal.recoveredFromInvalidState).toBe(true);
    expect(rehearsal.recoveryReason).toMatch(/restored the canonical main scenario/i);
    expect(scenario.agents[0]?.label).toBe("Planner Agent");
    expect(scenario.revocations).toEqual([]);
  });

  it("rejects contract-invalid custom state and repairs to canonical main preset", () => {
    const broken = createMainDemoScenario();
    const firstAction = broken.actionAttempts.find(
      (action) => action.id === "action-calendar-read-001",
    );

    if (!firstAction) {
      throw new Error("Expected calendar action in main scenario.");
    }

    firstAction.parentWarrantId = "warrant-does-not-exist";

    writeFileSync(
      demoStateFile,
      JSON.stringify({
        version: 1,
        kind: "custom",
        preset: "main",
        scenario: broken,
        updatedAt: "2026-04-17T09:00:00.000Z",
      }),
      "utf8",
    );

    const rehearsal = loadDemoRehearsalSnapshot();
    const repaired = loadDemoState();

    expect(rehearsal.preset).toBe("main");
    expect(rehearsal.recoveredFromInvalidState).toBe(true);
    expect(rehearsal.recoveryReason).toMatch(/restored the canonical main scenario/i);
    expect(
      validateDemoScenarioContract(repaired, "main"),
    ).toEqual({
      ok: true,
      issues: [],
    });
  });

  it("flags recovery when the stored demo state file is half-written", () => {
    writeFileSync(demoStateFile, "{broken", "utf8");

    const rehearsal = loadDemoRehearsalSnapshot();

    expect(rehearsal.preset).toBe("main");
    expect(rehearsal.recoveredFromInvalidState).toBe(true);
    expect(rehearsal.recoveryReason).toMatch(/half-written or unreadable/i);
  });
});
