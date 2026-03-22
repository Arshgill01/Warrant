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
    expect(comms?.data.status).toBe("pending-approval");
    expect(comms?.data.statusReason).toContain("explicitly approve");
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

  it("maps pending approval and denied status from shared scenario state", () => {
    const pendingView = createDelegationGraphView(createDefaultDemoScenario());
    const pendingComms = pendingView.warrantSummaries.find(
      (summary) => summary.id === "warrant-comms-child-001",
    );

    expect(pendingComms?.status).toBe("pending-approval");
    expect(pendingComms?.pendingApproval?.title).toBe("Approve investor follow-up send");
    expect(pendingComms?.statusSource).toBe("approval");

    const deniedScenario = createDefaultDemoScenario();
    deniedScenario.approvals = [];

    deniedScenario.actionAttempts.push({
      id: "action-comms-send-overreach-001",
      kind: "gmail.send",
      agentId: "agent-comms-001",
      warrantId: "warrant-comms-child-001",
      requestedAt: "2026-04-17T09:11:00.000Z",
      rootRequestId: "request-investor-update-001",
      parentWarrantId: "warrant-planner-root-001",
      createdAt: "2026-04-17T09:11:00.000Z",
      target: {
        recipients: ["partners@northstar.vc"],
      },
      usage: {
        sendsUsed: 0,
      },
      summary: "Comms Agent attempted to send the investor follow-up directly.",
      resource: "Send investor follow-up to partners@northstar.vc",
      outcome: "blocked",
      outcomeReason: "This warrant does not allow gmail.send.",
      authorization: {
        allowed: false,
        code: "capability_missing",
        message: "This warrant does not allow gmail.send.",
        effectiveStatus: "active",
        blockedByWarrantId: "warrant-comms-child-001",
      },
      providerState: null,
      providerHeadline: null,
      providerDetail: null,
    });

    const deniedView = createDelegationGraphView(deniedScenario);
    const deniedComms = deniedView.warrantSummaries.find(
      (summary) => summary.id === "warrant-comms-child-001",
    );

    expect(deniedComms?.status).toBe("denied");
    expect(deniedComms?.latestAction?.id).toBe("action-comms-send-overreach-001");
    expect(deniedComms?.statusReason).toBe("This warrant does not allow gmail.send.");
  });

  it("distinguishes provider-blocked, revoked, and expired states while keeping detail data aligned", () => {
    const providerBlockedScenario = createDefaultDemoScenario();

    providerBlockedScenario.actionAttempts.push({
      id: "action-calendar-read-provider-blocked-001",
      kind: "calendar.read",
      agentId: "agent-calendar-001",
      warrantId: "warrant-calendar-child-001",
      requestedAt: "2026-04-17T09:12:00.000Z",
      rootRequestId: "request-investor-update-001",
      parentWarrantId: "warrant-planner-root-001",
      createdAt: "2026-04-17T09:12:00.000Z",
      target: {
        scheduledFor: "2026-04-18T10:30:00.000Z",
      },
      summary: "Calendar Agent could not complete the delegated availability read.",
      resource: "Calendar window for 2026-04-18",
      outcome: "blocked",
      outcomeReason: "Delegated Google Calendar access is waiting on the provider path.",
      authorization: {
        allowed: true,
        code: "allowed",
        message: "This action is within the warrant bounds.",
        effectiveStatus: "active",
        blockedByWarrantId: null,
      },
      providerState: "pending",
      providerHeadline: "Calendar Agent is waiting for delegated Google access.",
      providerDetail: "Auth0 started the provider handoff, but the calendar path is not ready yet.",
    });

    const providerBlockedView = createDelegationGraphView(providerBlockedScenario);
    const calendarSummary = providerBlockedView.warrantSummaries.find(
      (summary) => summary.id === "warrant-calendar-child-001",
    );

    expect(calendarSummary?.status).toBe("blocked");
    expect(calendarSummary?.statusSource).toBe("provider");
    expect(calendarSummary?.latestAction?.providerState).toBe("pending");

    const revokedScenario = createDefaultDemoScenario();
    const commsWarrant = revokedScenario.warrants.find(
      (warrant) => warrant.id === "warrant-comms-child-001",
    );

    if (!commsWarrant) {
      throw new Error("Expected comms warrant in revoked scenario test.");
    }

    commsWarrant.status = "revoked";
    commsWarrant.revokedAt = "2026-04-17T09:15:00.000Z";
    commsWarrant.revocationReason = "Planner revoked the Comms branch after a risky send attempt.";

    const revokedView = createDelegationGraphView(revokedScenario);

    expect(
      revokedView.warrantSummaries.find((summary) => summary.id === "warrant-comms-child-001")?.status,
    ).toBe("revoked");

    const expiredScenario = createDefaultDemoScenario();
    const calendarWarrant = expiredScenario.warrants.find(
      (warrant) => warrant.id === "warrant-calendar-child-001",
    );

    if (!calendarWarrant) {
      throw new Error("Expected calendar warrant in expired scenario test.");
    }

    calendarWarrant.status = "expired";

    const expiredView = createDelegationGraphView(expiredScenario);

    expect(
      expiredView.warrantSummaries.find((summary) => summary.id === "warrant-calendar-child-001")?.status,
    ).toBe("expired");
  });
});
