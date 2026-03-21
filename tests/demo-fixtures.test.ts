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
    expect(first.agents.map((agent) => agent.role)).toEqual(["planner", "calendar", "comms"]);
    expect(first.approvals).toEqual([]);
    expect(first.revocations).toEqual([]);

    first.user.label = "Changed User";

    expect(second.user.label).toBe("Maya Chen");
  });

  it("covers the required core planner-to-child flow with concrete seeded examples", () => {
    const scenario = createDefaultDemoScenario();
    const examples = getDisplayScenarioExamples(scenario);

    expect(examples.calendarChildWarrant.status).toBe("active");
    expect(examples.calendarChildWarrant.capabilities).toEqual(["Read calendar"]);
    expect(examples.commsChildWarrant.status).toBe("active");
    expect(examples.commsChildWarrant.capabilities).toEqual(["Draft email"]);
    expect(examples.calendarAction.outcome).toBe("allowed");
    expect(examples.calendarAction.kind).toBe("calendar.read");
    expect(examples.commsDraftAction.outcome).toBe("allowed");
    expect(examples.commsDraftAction.kind).toBe("gmail.draft");
  });

  it("loads graph and timeline views from the same canonical state and resets safely", () => {
    const snapshot = loadDemoState();
    snapshot.user.label = "Local Only";

    expect(loadDemoState().user.label).toBe("Maya Chen");

    snapshot.agents[0]!.label = "Modified Planner";
    replaceDemoState(snapshot);

    const graphView = loadDelegationGraphView();
    const timeline = loadTimelineEvents();

    expect(graphView.nodes.find((node) => node.id === "warrant-comms-child-001")?.status).toBe("active");
    expect(graphView.nodes.find((node) => node.id === "warrant-comms-child-001")?.parentId).toBe(
      "warrant-planner-root-001",
    );
    expect(timeline.map((event) => event.at)).toEqual([...timeline.map((event) => event.at)].sort());
    expect(timeline.at(-1)?.actionId).toBe("action-comms-draft-001");

    resetDemoState();

    expect(loadDemoState().agents[0]?.label).toBe("Planner Agent");
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
});
