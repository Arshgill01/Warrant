import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import { createDefaultDemoScenario, createDelegationGraphView } from "@/demo-fixtures";

describe("node detail panel", () => {
  it("renders the latest policy denial separately from approval history and post-revoke execution state", () => {
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

    expect(html).toContain("Latest execution");
    expect(html).toContain("Latest Policy Denial");
    expect(html).toContain("Latest approval");
    expect(html).toContain(
      "Comms Agent tried to send again after Maya revoked the branch.",
    );
    expect(html).toContain(
      "Attempted to send the drafted investor follow-ups to an out-of-policy recipient.",
    );
    expect(html).toContain("recipient_not_allowed");
    expect(html).toContain("Approve investor follow-up send");
    expect(html).toContain("approved");
    expect(html).toContain("warrant-comms-child-001");
  });
});
