import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultDemoScenario,
  getDisplayScenarioExamples,
  loadDelegationGraphView,
  loadDemoState,
  loadTimelineEvents,
  replaceDemoState,
  resetDemoState,
} from "../src/demo-fixtures";

describe("demo fixtures", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("creates a deterministic canonical scenario with isolated copies", () => {
    const first = createDefaultDemoScenario();
    const second = createDefaultDemoScenario();

    expect(first).toEqual(second);
    expect(first.taskPrompt).toBe("Prepare my investor update for tomorrow and coordinate follow-ups.");
    expect(first.agents.map((agent) => agent.role)).toEqual(expect.arrayContaining(["planner", "calendar", "comms", "docs"]));

    first.user.label = "Changed User";

    expect(second.user.label).toBe("Maya Chen");
  });

  it("covers the required demo beats with concrete seeded examples", () => {
    const scenario = createDefaultDemoScenario();
    const examples = getDisplayScenarioExamples(scenario);

    expect(examples.validChildAction.outcome).toBe("allowed");
    expect(examples.validChildAction.kind).toBe("calendar.read");

    expect(examples.blockedOverreachAction.outcome).toBe("blocked");
    expect(examples.blockedOverreachAction.outcomeReason).toContain("techdaily.com");

    expect(examples.approvalPendingAction.outcome).toBe("approval-required");
    expect(examples.approvalPendingRequest.status).toBe("pending");
    expect(examples.approvalPendingRequest.affectedRecipients).toEqual([
      "partners@northstar.vc",
      "finance@northstar.vc",
    ]);

    expect(examples.revokedBranchSummary.status).toBe("revoked");
    expect(examples.revokedDescendantCount).toBe(1);
    expect(examples.revokedBranchSummary.revocationReason).toContain("overreach attempt");
  });

  it("loads graph and timeline views from the same canonical state and resets safely", () => {
    const snapshot = loadDemoState();
    snapshot.user.label = "Local Only";

    expect(loadDemoState().user.label).toBe("Maya Chen");

    snapshot.agents[0]!.label = "Modified Planner";
    replaceDemoState(snapshot);

    const graphView = loadDelegationGraphView();
    const timeline = loadTimelineEvents();

    expect(graphView.nodes.find((node) => node.id === "warrant-comms-child-001")?.status).toBe("revoked");
    expect(graphView.nodes.find((node) => node.id === "warrant-docs-child-001")?.parentId).toBe(
      "warrant-comms-child-001",
    );
    expect(timeline.map((event) => event.at)).toEqual([...timeline.map((event) => event.at)].sort());
    expect(timeline.at(-1)?.revocationId).toBe("revocation-comms-001");

    resetDemoState();

    expect(loadDemoState().agents[0]?.label).toBe("Planner Agent");
  });
});
