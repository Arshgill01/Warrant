import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DemoScenario, WarrantDisplaySummary } from "@/contracts";
import {
  DemoSurface,
  deriveRehearsalControlsState,
} from "@/components/demo/demo-surface";
import {
  createActionAttemptDisplayRecords,
  createApprovalStateDisplayRecords,
  createCommsRevokedDemoScenario,
  createDelegationGraphView,
  createMainDemoScenario,
  createTimelineEventDisplayRecords,
} from "@/demo-fixtures";
import type { DemoRehearsalSnapshot } from "@/demo-fixtures/state";

const CALENDAR_WARRANT_ID = "warrant-calendar-child-001";
const COMMS_WARRANT_ID = "warrant-comms-child-001";
const COMMS_OVERREACH_ACTION_ID = "action-comms-send-overreach-001";
const COMMS_APPROVAL_ACTION_ID = "action-comms-send-001";
const COMMS_POST_REVOKE_ACTION_ID = "action-comms-send-post-revoke-001";
const COMMS_APPROVAL_ID = "approval-comms-send-001";

function requireValue<Value>(value: Value | null | undefined, message: string): Value {
  if (value === undefined || value === null) {
    throw new Error(message);
  }

  return value;
}

function requireSummary(
  summaries: WarrantDisplaySummary[],
  warrantId: string,
): WarrantDisplaySummary {
  return requireValue(
    summaries.find((summary) => summary.id === warrantId),
    `Missing warrant summary ${warrantId}.`,
  );
}

function createPolicyDeniedScenario(): DemoScenario {
  const scenario = createMainDemoScenario();

  scenario.approvals = [];
  scenario.actionAttempts = scenario.actionAttempts.filter(
    (action) => action.id !== COMMS_APPROVAL_ACTION_ID,
  );
  scenario.timeline = scenario.timeline.filter(
    (event) =>
      event.actionId !== COMMS_APPROVAL_ACTION_ID &&
      event.approvalId !== COMMS_APPROVAL_ID,
  );

  return scenario;
}

function createApprovalDeniedScenario(): DemoScenario {
  const scenario = createMainDemoScenario();
  const approval = requireValue(
    scenario.approvals.find((record) => record.id === COMMS_APPROVAL_ID),
    "Missing comms approval in scenario.",
  );
  const commsWarrant = requireValue(
    scenario.warrants.find((warrant) => warrant.id === COMMS_WARRANT_ID),
    "Missing comms warrant in scenario.",
  );

  approval.status = "denied";
  approval.decidedAt = "2026-04-17T09:11:30.000Z";

  scenario.timeline.push({
    id: "event-comms-send-approval-denied-001",
    at: approval.decidedAt,
    kind: "approval.denied",
    actorKind: "user",
    actorId: scenario.user.id,
    warrantId: commsWarrant.id,
    parentWarrantId: commsWarrant.parentId,
    actionId: approval.actionId,
    approvalId: approval.id,
    revocationId: null,
    title: "Approval denied for the exact send",
    description:
      "Maya denied the exact email preview through Auth0, so Warrant kept the real Gmail send blocked.",
  });

  return scenario;
}

function createExpiredCalendarScenario(): DemoScenario {
  const scenario = createMainDemoScenario();
  const calendarWarrant = requireValue(
    scenario.warrants.find((warrant) => warrant.id === CALENDAR_WARRANT_ID),
    "Missing calendar warrant in scenario.",
  );

  calendarWarrant.status = "expired";
  calendarWarrant.revokedAt = null;
  calendarWarrant.revocationReason = null;
  calendarWarrant.revocationSourceId = null;
  calendarWarrant.revokedBy = null;

  return scenario;
}

function renderSurface(scenario: DemoScenario): string {
  Object.assign(globalThis, {
    React,
  });

  return renderToStaticMarkup(
    React.createElement(DemoSurface, {
      initialScenario: scenario,
      authConfigured: false,
    }),
  );
}

function createMainPresetRehearsalSnapshot(): DemoRehearsalSnapshot {
  return {
    kind: "preset",
    preset: "main",
    label: "Main scenario (pre-revoke)",
    description:
      "Restores the canonical rehearsal state before revocation: draft succeeds, overreach is blocked, and the bounded send pauses for approval.",
    updatedAt: "2026-04-17T09:00:00.000Z",
    controlsEnabled: true,
    recoveredFromInvalidState: false,
    recoveryReason: null,
    presets: [
      {
        id: "main",
        label: "Main scenario (pre-revoke)",
        description:
          "Restores the canonical rehearsal state before revocation: draft succeeds, overreach is blocked, and the bounded send pauses for approval.",
      },
      {
        id: "comms-revoked",
        label: "Comms revoked (post-revoke)",
        description:
          "Restores the post-revoke replay state after Maya revokes the Comms branch so the graph and audit trail prove branch-level authority loss.",
      },
    ],
  };
}

describe("state surface proof coverage", () => {
  it("proves graph-facing summaries expose required states and keep them distinct", () => {
    const pendingGraph = createDelegationGraphView(createMainDemoScenario());
    const deniedGraph = createDelegationGraphView(createPolicyDeniedScenario());
    const revokedGraph = createDelegationGraphView(createCommsRevokedDemoScenario());
    const deniedApprovalGraph = createDelegationGraphView(createApprovalDeniedScenario());
    const expiredGraph = createDelegationGraphView(createExpiredCalendarScenario());

    const pendingComms = requireSummary(pendingGraph.warrantSummaries, COMMS_WARRANT_ID);
    const deniedComms = requireSummary(deniedGraph.warrantSummaries, COMMS_WARRANT_ID);
    const revokedComms = requireSummary(revokedGraph.warrantSummaries, COMMS_WARRANT_ID);
    const deniedApprovalComms = requireSummary(
      deniedApprovalGraph.warrantSummaries,
      COMMS_WARRANT_ID,
    );
    const activeCalendar = requireSummary(pendingGraph.warrantSummaries, CALENDAR_WARRANT_ID);
    const expiredCalendar = requireSummary(expiredGraph.warrantSummaries, CALENDAR_WARRANT_ID);

    expect({
      denied_policy: deniedComms.status,
      approval_required: pendingComms.latestAction?.controlState,
      approval_pending: pendingComms.pendingApproval?.controlState,
      approval_approved: revokedComms.latestApproval?.controlState,
      approval_denied: deniedApprovalComms.latestApproval?.controlState,
      blocked_revoked: revokedComms.latestAction?.controlState,
      active: activeCalendar.status,
      revoked: revokedComms.status,
      expired: expiredCalendar.status,
    }).toEqual({
      denied_policy: "denied_policy",
      approval_required: "approval_required",
      approval_pending: "approval_pending",
      approval_approved: "approval_approved",
      approval_denied: "approval_denied",
      blocked_revoked: "blocked_revoked",
      active: "active",
      revoked: "revoked",
      expired: "expired",
    });

    expect(deniedComms.status).toBe("denied_policy");
    expect(pendingComms.status).toBe("approval_pending");
    expect(revokedComms.status).toBe("revoked");
    expect(deniedComms.status).not.toBe(pendingComms.status);
    expect(deniedComms.latestPolicyDenial?.authorization.code).not.toBe(
      revokedComms.latestAction?.authorization.code,
    );
    expect(pendingComms.pendingApproval?.status).not.toBe(
      revokedComms.latestApproval?.status,
    );
    expect(revokedComms.latestApproval?.status).not.toBe(
      deniedApprovalComms.latestApproval?.status,
    );
  });

  it("proves action and timeline records keep denied policy, approval states, and revoked blocking separate", () => {
    const pendingScenario = createMainDemoScenario();
    const revokedScenario = createCommsRevokedDemoScenario();
    const deniedApprovalScenario = createApprovalDeniedScenario();

    const pendingActions = createActionAttemptDisplayRecords(pendingScenario);
    const revokedActions = createActionAttemptDisplayRecords(revokedScenario);
    const pendingApprovals = createApprovalStateDisplayRecords(pendingScenario);
    const approvedApprovals = createApprovalStateDisplayRecords(revokedScenario);
    const deniedApprovals = createApprovalStateDisplayRecords(deniedApprovalScenario);
    const pendingTimeline = createTimelineEventDisplayRecords(pendingScenario);
    const revokedTimeline = createTimelineEventDisplayRecords(revokedScenario);
    const deniedTimeline = createTimelineEventDisplayRecords(deniedApprovalScenario);

    const deniedPolicyAction = requireValue(
      pendingActions.find((record) => record.id === COMMS_OVERREACH_ACTION_ID),
      "Missing policy-denied action record.",
    );
    const approvalRequiredAction = requireValue(
      pendingActions.find((record) => record.id === COMMS_APPROVAL_ACTION_ID),
      "Missing approval-required action record.",
    );
    const blockedRevokedAction = requireValue(
      revokedActions.find((record) => record.id === COMMS_POST_REVOKE_ACTION_ID),
      "Missing blocked-revoked action record.",
    );
    const approvalPending = requireValue(
      pendingApprovals.find((record) => record.id === COMMS_APPROVAL_ID),
      "Missing pending approval record.",
    );
    const approvalApproved = requireValue(
      approvedApprovals.find((record) => record.id === COMMS_APPROVAL_ID),
      "Missing approved approval record.",
    );
    const approvalDenied = requireValue(
      deniedApprovals.find((record) => record.id === COMMS_APPROVAL_ID),
      "Missing denied approval record.",
    );

    expect({
      denied_policy: deniedPolicyAction.controlState,
      approval_required: approvalRequiredAction.controlState,
      approval_pending: approvalPending.controlState,
      approval_approved: approvalApproved.controlState,
      approval_denied: approvalDenied.controlState,
      blocked_revoked: blockedRevokedAction.controlState,
    }).toEqual({
      denied_policy: "denied_policy",
      approval_required: "approval_required",
      approval_pending: "approval_pending",
      approval_approved: "approval_approved",
      approval_denied: "approval_denied",
      blocked_revoked: "blocked_revoked",
    });

    const pendingApprovalEvent = requireValue(
      pendingTimeline.find((event) => event.kind === "approval.requested"),
      "Missing approval.requested timeline event.",
    );
    const approvedApprovalEvent = requireValue(
      revokedTimeline.find((event) => event.kind === "approval.approved"),
      "Missing approval.approved timeline event.",
    );
    const deniedApprovalEvent = requireValue(
      deniedTimeline.find((event) => event.kind === "approval.denied"),
      "Missing approval.denied timeline event.",
    );
    const policyDeniedBlockedEvent = requireValue(
      pendingTimeline.find(
        (event) =>
          event.kind === "action.blocked" && event.actionId === COMMS_OVERREACH_ACTION_ID,
      ),
      "Missing policy-denied action.blocked timeline event.",
    );
    const revokedBlockedEvent = requireValue(
      revokedTimeline.find(
        (event) =>
          event.kind === "action.blocked" && event.actionId === COMMS_POST_REVOKE_ACTION_ID,
      ),
      "Missing revoked-blocked action.blocked timeline event.",
    );

    expect(pendingApprovalEvent.kind).toBe("approval.requested");
    expect(approvedApprovalEvent.kind).toBe("approval.approved");
    expect(deniedApprovalEvent.kind).toBe("approval.denied");
    expect(pendingApprovalEvent.controlState).toBe("approval_pending");
    expect(approvedApprovalEvent.controlState).toBe("approval_approved");
    expect(deniedApprovalEvent.controlState).toBe("approval_denied");
    expect(policyDeniedBlockedEvent.actionId).toBe(COMMS_OVERREACH_ACTION_ID);
    expect(revokedBlockedEvent.actionId).toBe(COMMS_POST_REVOKE_ACTION_ID);
    expect(policyDeniedBlockedEvent.proposalId).toBe("proposal-comms-send-overreach-001");
    expect(revokedBlockedEvent.proposalId).toBe("proposal-comms-send-post-revoke-001");
    expect(policyDeniedBlockedEvent.controlState).toBe("denied_policy");
    expect(revokedBlockedEvent.controlState).toBe("blocked_revoked");
    expect(policyDeniedBlockedEvent.runtimeControlState).toBe("denied_policy");
    expect(revokedBlockedEvent.runtimeControlState).toBe("blocked_revoked");
    expect(deniedPolicyAction.authorization.code).not.toBe(
      blockedRevokedAction.authorization.code,
    );
    expect(pendingApprovalEvent.kind).not.toBe(approvedApprovalEvent.kind);
    expect(approvedApprovalEvent.kind).not.toBe(deniedApprovalEvent.kind);
  });

  it("proves rendered labels and badges keep policy denial, approval, and revoked-blocked states distinct", () => {
    const pendingHtml = renderSurface(createMainDemoScenario());
    const deniedApprovalHtml = renderSurface(createApprovalDeniedScenario());
    const revokedHtml = renderSurface(createCommsRevokedDemoScenario());

    expect(pendingHtml).toContain("current: approval pending");
    expect(pendingHtml).toContain("pending in auth0");
    expect(pendingHtml).toContain("approval required");
    expect(pendingHtml).toContain("Proposal");
    expect(pendingHtml).toContain("Runtime");
    expect(pendingHtml).toContain("Policy code: recipient_not_allowed");

    expect(deniedApprovalHtml).toContain("current: approval denied");
    expect(deniedApprovalHtml).toContain("approval denied in auth0");
    expect(deniedApprovalHtml).toContain("still blocked");

    expect(revokedHtml).toContain("current: branch revoked");
    expect(revokedHtml).toContain("approved in auth0");
    expect(revokedHtml).toContain("Policy code: warrant_revoked");
    expect(revokedHtml).toContain("2 Active");
    expect(revokedHtml).toContain("1 Revoked");
    expect(revokedHtml).toContain("expired");

    expect(pendingHtml).not.toContain("current: branch revoked");
    expect(deniedApprovalHtml).not.toContain("current: approval pending");
    expect(revokedHtml).not.toContain("current: approval denied");
  });

  it("marks the rehearsal controls as custom when scenario state diverges from the selected preset", () => {
    const rehearsal = createMainPresetRehearsalSnapshot();
    const derived = deriveRehearsalControlsState({
      rehearsal,
      scenario: createCommsRevokedDemoScenario(),
    });

    expect(derived.kind).toBe("custom");
    expect(derived.preset).toBe("main");
    expect(derived.label).toContain("Custom state");
    expect(derived.label).toContain("Main scenario (pre-revoke)");
    expect(derived.description).toMatch(/diverged from the selected preset/i);
  });

  it("keeps the rehearsal controls on preset labeling when scenario matches the selected preset", () => {
    const rehearsal = createMainPresetRehearsalSnapshot();
    const derived = deriveRehearsalControlsState({
      rehearsal,
      scenario: createMainDemoScenario(),
    });

    expect(derived.kind).toBe("preset");
    expect(derived.label).toBe("Main scenario (pre-revoke)");
    expect(derived.description).toContain("canonical rehearsal state");
  });
});
