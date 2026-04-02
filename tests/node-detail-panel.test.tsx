import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import { createDefaultDemoScenario, createDelegationGraphView } from "@/demo-fixtures";

describe("node detail panel", () => {
  it("renders the latest policy denial separately from the latest approval-gated execution", () => {
    Object.assign(globalThis, {
      React,
    });

    const graphView = createDelegationGraphView(createDefaultDemoScenario());
    const commsWarrant = graphView.warrantSummaries.find(
      (summary) => summary.id === "warrant-comms-child-001",
    );

    if (!commsWarrant) {
      throw new Error("Expected comms warrant summary for node-detail test.");
    }

    const html = renderToStaticMarkup(
      React.createElement(NodeDetailPanel, {
        warrant: commsWarrant,
        onClose: () => {},
        onRevoke: () => {},
      }),
    );

    expect(html).toContain("Latest action");
    expect(html).toContain("Latest denied action");
    expect(html).toContain("Approval request");
    expect(html).toContain(
      "Prepared the investor follow-up send and stopped for approval.",
    );
    expect(html).toContain(
      "Tried to send the investor follow-up to a recipient outside this branch.",
    );
    expect(html).toContain("recipient_not_allowed");
    expect(html).toContain("Approve investor follow-up send");
    expect(html).toContain("warrant-comms-child-001");
  });
});
