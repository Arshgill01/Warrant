import { describe, expect, it } from "vitest";
import { createDefaultDemoScenario, createDelegationGraphView } from "@/demo-fixtures";
import {
  buildDelegationGraphEdges,
  buildDelegationGraphNodes,
  collectDescendantNodeIds,
} from "@/graph/view-model";

describe("delegation graph view model", () => {
  it("builds graph nodes from the canonical seeded scenario with a stable shallow layout", () => {
    const scenario = createDefaultDemoScenario();
    const graphView = createDelegationGraphView(scenario);
    const nodes = buildDelegationGraphNodes({
      graphNodes: graphView.nodes,
    });

    const planner = nodes.find((node) => node.id === "warrant-planner-root-001");
    const calendar = nodes.find((node) => node.id === "warrant-calendar-child-001");
    const comms = nodes.find((node) => node.id === "warrant-comms-child-001");

    expect(nodes).toHaveLength(3);
    expect(planner?.data.label).toBe("Planner Agent");
    expect(calendar?.data.role).toBe("calendar");
    expect(comms?.data.status).toBe("active");
    expect(calendar?.position.y).toBe(comms?.position.y);
    expect(planner?.position.y).toBeLessThan(calendar?.position.y ?? Number.MAX_SAFE_INTEGER);
  });

  it("creates edges and descendant sets that preserve branch lineage", () => {
    const scenario = createDefaultDemoScenario();
    const graphView = createDelegationGraphView(scenario);
    const edges = buildDelegationGraphEdges(graphView.edges);
    const commsBranch = collectDescendantNodeIds(graphView.nodes, "warrant-comms-child-001");

    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => [edge.source, edge.target])).toEqual(
      expect.arrayContaining([
        ["warrant-planner-root-001", "warrant-calendar-child-001"],
        ["warrant-planner-root-001", "warrant-comms-child-001"],
      ]),
    );
    expect(commsBranch).toEqual(["warrant-comms-child-001"]);
  });
});
