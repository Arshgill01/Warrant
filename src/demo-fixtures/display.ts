import {
  approvalStatusControlStateMap,
  mapRuntimeControlStateToCanonicalState,
  mapActionOutcomeToControlState,
  timelineKindControlStateMap,
} from "@/contracts";
import type {
  ActionAttemptDisplayRecord,
  ActionKind,
  ApprovalStateDisplayRecord,
  CanonicalControlState,
  DelegationGraphDTO,
  DemoScenario,
  DisplayField,
  DisplayScenarioExampleSet,
  DisplayStatus,
  GraphEdgeDTO,
  GraphNodeDTO,
  RuntimeProposalControlDecision,
  TimelineEventDisplayRecord,
  WarrantDisplaySummary,
} from "@/contracts";
import type { LedgerEventKind } from "@/contracts";

const capabilityLabels: Record<ActionKind, string> = {
  "calendar.read": "Read calendar",
  "calendar.schedule": "Schedule meetings",
  "docs.read": "Read docs",
  "gmail.draft": "Draft email",
  "gmail.send": "Send email",
  "warrant.issue": "Delegate child warrants",
  "warrant.revoke": "Revoke warrants",
};

const timelineEventMeta: Record<
  LedgerEventKind,
  {
    kindLabel: string;
    resultLabel: string;
  }
> = {
  "scenario.loaded": {
    kindLabel: "Scenario",
    resultLabel: "Loaded",
  },
  "warrant.issued": {
    kindLabel: "Warrant",
    resultLabel: "Issued",
  },
  "action.allowed": {
    kindLabel: "Action",
    resultLabel: "Completed",
  },
  "action.blocked": {
    kindLabel: "Action",
    resultLabel: "Blocked",
  },
  "approval.requested": {
    kindLabel: "Approval",
    resultLabel: "Requested",
  },
  "approval.approved": {
    kindLabel: "Approval",
    resultLabel: "Approved",
  },
  "approval.denied": {
    kindLabel: "Approval",
    resultLabel: "Denied",
  },
  "warrant.revoked": {
    kindLabel: "Branch",
    resultLabel: "Revoked",
  },
};

const required = <Value>(value: Value | undefined, message: string): Value => {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
};

function formatDateTime(value: string): string {
  return value.replace(".000Z", "Z").replace("T", " ");
}

function formatConstraintFields(
  constraints: DemoScenario["warrants"][number]["resourceConstraints"],
): DisplayField[] {
  const fields: DisplayField[] = [];

  if (constraints.allowedRecipients?.length) {
    fields.push({
      label: "Allowed recipients",
      value: constraints.allowedRecipients.join(", "),
    });
  }

  if (constraints.allowedDomains?.length) {
    fields.push({
      label: "Allowed domains",
      value: constraints.allowedDomains.join(", "),
    });
  }

  if (constraints.allowedFolderIds?.length) {
    fields.push({
      label: "Allowed folders",
      value: constraints.allowedFolderIds.join(", "),
    });
  }

  if (constraints.calendarWindow) {
    fields.push({
      label: "Calendar window",
      value: `${formatDateTime(constraints.calendarWindow.startsAt)} to ${formatDateTime(
        constraints.calendarWindow.endsAt,
      )}`,
    });
  }

  if (constraints.maxDrafts !== undefined) {
    fields.push({
      label: "Draft limit",
      value: String(constraints.maxDrafts),
    });
  }

  if (constraints.maxSends !== undefined) {
    fields.push({
      label: "Send limit",
      value: String(constraints.maxSends),
    });
  }

  return fields;
}

function isPolicyDeniedAction(record: ActionAttemptDisplayRecord): boolean {
  return record.controlState === "denied_policy";
}

function getLatestRecordsByWarrantId<
  Record extends { warrantId: string; requestedAt?: string; expiresAt?: string },
>(
  records: Record[],
  getAt: (record: Record) => string,
  getTieBreakerId: (record: Record) => string,
): Map<string, Record> {
  const latestByWarrantId = new Map<string, Record>();

  records.forEach((record) => {
    const existing = latestByWarrantId.get(record.warrantId);

    if (!existing) {
      latestByWarrantId.set(record.warrantId, record);
      return;
    }

    const atComparison = getAt(record).localeCompare(getAt(existing));

    if (
      atComparison > 0 ||
      (atComparison === 0 &&
        getTieBreakerId(record).localeCompare(getTieBreakerId(existing)) >= 0)
    ) {
      latestByWarrantId.set(record.warrantId, record);
    }
  });

  return latestByWarrantId;
}

function getWarrantLineagePath(
  warrantId: string,
  warrantsById: Map<string, DemoScenario["warrants"][number]>,
  agentLabelsById: Map<string, string>,
): string[] {
  const path: string[] = [];
  let currentId: string | null = warrantId;

  while (currentId) {
    const warrant = warrantsById.get(currentId);

    if (!warrant) {
      break;
    }

    path.unshift(agentLabelsById.get(warrant.agentId) ?? warrant.agentId);
    currentId = warrant.parentId;
  }

  return path;
}

function resolveDisplayStatus(input: {
  agentStatus: DemoScenario["agents"][number]["status"];
  warrantStatus: DemoScenario["warrants"][number]["status"];
  expiresAt: string;
  revocationReason: string | null;
  latestRuntimeControlState: CanonicalControlState | null;
  latestRuntimeControlReason: string | null;
  pendingApproval: ApprovalStateDisplayRecord | null;
  latestApproval: ApprovalStateDisplayRecord | null;
  latestAction: ActionAttemptDisplayRecord | null;
}): {
  status: DisplayStatus;
  reason: string;
  source: "agent" | "approval" | "action" | "provider" | "warrant";
} {
  if (input.warrantStatus === "revoked") {
    return {
      status: "revoked",
      reason:
        input.revocationReason ??
        "This branch was revoked. This agent and any descendants can no longer act.",
      source: "warrant",
    };
  }

  if (input.warrantStatus === "expired") {
    return {
      status: "expired",
      reason: `This warrant expired at ${formatDateTime(input.expiresAt)}. New actions are no longer allowed.`,
      source: "warrant",
    };
  }

  if (input.latestRuntimeControlState === "blocked_revoked") {
    return {
      status: "blocked_revoked",
      reason:
        input.latestRuntimeControlReason ??
        "Runtime control marked this branch blocked because authority was revoked.",
      source: "action",
    };
  }

  if (input.latestRuntimeControlState === "blocked_expired") {
    return {
      status: "blocked_expired",
      reason:
        input.latestRuntimeControlReason ??
        "Runtime control marked this branch blocked because the warrant expired.",
      source: "action",
    };
  }

  if (input.latestRuntimeControlState === "denied_policy") {
    return {
      status: "denied_policy",
      reason:
        input.latestRuntimeControlReason ??
        "Runtime policy checks denied the latest proposal for this branch.",
      source: "action",
    };
  }

  if (input.latestRuntimeControlState === "provider_unavailable") {
    return {
      status: "provider_unavailable",
      reason:
        input.latestRuntimeControlReason ??
        "Runtime control marked this action blocked by provider execution readiness.",
      source: "provider",
    };
  }

  if (
    input.pendingApproval ||
    input.latestAction?.controlState === "approval_required" ||
    input.latestRuntimeControlState === "approval_required" ||
    input.latestRuntimeControlState === "approval_pending"
  ) {
    return {
      status:
        input.pendingApproval ||
        input.latestRuntimeControlState === "approval_pending"
          ? "approval_pending"
          : "approval_required",
      reason:
        input.pendingApproval?.reason ??
        input.latestRuntimeControlReason ??
        input.latestAction?.outcomeReason ??
        "This branch is waiting for human approval before it can continue.",
      source: "approval",
    };
  }

  if (input.latestAction?.controlState === "blocked_revoked") {
    return {
      status: "blocked_revoked",
      reason: input.latestAction.outcomeReason,
      source: "action",
    };
  }

  if (input.latestAction?.controlState === "blocked_expired") {
    return {
      status: "blocked_expired",
      reason: input.latestAction.outcomeReason,
      source: "action",
    };
  }

  if (
    input.latestAction?.controlState === "denied_policy" &&
    input.latestAction.providerState === null
  ) {
    return {
      status: "denied_policy",
      reason: input.latestAction.outcomeReason,
      source: "action",
    };
  }

  if (input.latestApproval?.controlState === "approval_denied") {
    return {
      status: "approval_denied",
      reason: input.latestApproval.reason,
      source: "approval",
    };
  }

  if (
    input.agentStatus === "blocked" ||
    input.latestAction?.controlState === "provider_unavailable" ||
    (input.latestAction?.providerState !== null &&
      input.latestAction?.providerState !== undefined &&
      input.latestAction.providerState !== "success")
  ) {
    return {
      status:
        input.latestAction?.controlState === "provider_unavailable"
          ? "provider_unavailable"
          : "active",
      reason:
        input.latestAction?.providerDetail ??
        input.latestAction?.providerHeadline ??
        input.latestAction?.outcomeReason ??
        "This branch is active but waiting on external execution readiness.",
      source:
        input.latestAction?.providerState &&
        input.latestAction.providerState !== "success"
          ? "provider"
          : "agent",
    };
  }

  if (input.agentStatus === "idle") {
    return {
      status: "active",
      reason: "This branch has not acted yet.",
      source: "agent",
    };
  }

  return {
    status: "active",
    reason:
      input.latestAction?.providerDetail ??
      input.latestAction?.outcomeReason ??
      "This branch is active and staying within its warrant.",
    source:
      input.latestAction?.providerState === "success" ? "provider" : "warrant",
  };
}

export function createWarrantDisplaySummaries(
  scenario: DemoScenario,
): WarrantDisplaySummary[] {
  const agentsById = new Map(scenario.agents.map((agent) => [agent.id, agent]));
  const warrantsById = new Map(
    scenario.warrants.map((warrant) => [warrant.id, warrant]),
  );
  const actionRecords = createActionAttemptDisplayRecords(scenario);
  const approvalRecords = createApprovalStateDisplayRecords(scenario);
  const scenarioActionIds = new Set(actionRecords.map((record) => record.id));
  const latestRuntimeDecisionByWarrantId = getLatestRecordsByWarrantId(
    scenario.controlDecisions.filter((record) =>
      scenarioActionIds.has(record.actionId),
    ),
    (record) => record.at,
    (record) => record.proposalId,
  );
  const latestRuntimeEventByWarrantId = getLatestRecordsByWarrantId(
    scenario.runtimeEvents.filter(
      (record) => record.actionId !== null && scenarioActionIds.has(record.actionId),
    ),
    (record) => record.at,
    (record) => record.id,
  );
  const latestActionByWarrantId = getLatestRecordsByWarrantId(
    actionRecords,
    (record) => record.requestedAt,
    (record) => record.id,
  );
  const latestPolicyDenialByWarrantId = getLatestRecordsByWarrantId(
    actionRecords.filter(isPolicyDeniedAction),
    (record) => record.requestedAt,
    (record) => record.id,
  );
  const pendingApprovalByWarrantId = getLatestRecordsByWarrantId(
    approvalRecords.filter(
      (approval) => approval.controlState === "approval_pending",
    ),
    (record) => record.requestedAt,
    (record) => record.id,
  );
  const latestApprovalByWarrantId = getLatestRecordsByWarrantId(
    approvalRecords,
    (record) => record.decidedAt ?? record.requestedAt,
    (record) => record.id,
  );

  return scenario.warrants.map((warrant) => {
    const agent = required(
      agentsById.get(warrant.agentId),
      `Missing agent for warrant ${warrant.id}`,
    );
    const parentWarrant = warrant.parentId
      ? warrantsById.get(warrant.parentId) ?? null
      : null;
    const parentLabel = parentWarrant
      ? agentsById.get(parentWarrant.agentId)?.label ?? parentWarrant.agentId
      : null;
    const latestAction = latestActionByWarrantId.get(warrant.id) ?? null;
    const latestPolicyDenial =
      latestPolicyDenialByWarrantId.get(warrant.id) ?? null;
    const latestRuntimeDecision =
      latestRuntimeDecisionByWarrantId.get(warrant.id) ?? null;
    const latestRuntimeEvent = latestRuntimeEventByWarrantId.get(warrant.id) ?? null;
    const pendingApproval = pendingApprovalByWarrantId.get(warrant.id) ?? null;
    const latestApproval = latestApprovalByWarrantId.get(warrant.id) ?? null;
    const latestRuntimeControlState = latestRuntimeDecision
      ? mapRuntimeControlStateToCanonicalState(latestRuntimeDecision.controlState)
      : null;
    const status = resolveDisplayStatus({
      agentStatus: agent.status,
      warrantStatus: warrant.status,
      expiresAt: warrant.expiresAt,
      revocationReason: warrant.revocationReason,
      latestRuntimeControlState,
      latestRuntimeControlReason: latestRuntimeDecision?.reason ?? null,
      pendingApproval,
      latestApproval,
      latestAction,
    });

    return {
      id: warrant.id,
      parentId: warrant.parentId,
      parentLabel,
      rootRequestId: warrant.rootRequestId,
      agentId: warrant.agentId,
      agentLabel: agent.label,
      agentRole: agent.role,
      runtimeActorId: latestRuntimeDecision?.runtimeActorId ?? agent.runtimeActorId,
      runtimeActorLabel: agent.runtimeActorLabel,
      latestRuntimeProposalId: latestRuntimeDecision?.proposalId ?? null,
      latestRuntimeControlState,
      latestRuntimeControlReason: latestRuntimeDecision?.reason ?? null,
      latestRuntimeControlAt: latestRuntimeDecision?.at ?? null,
      latestRuntimeEventTitle: latestRuntimeEvent?.title ?? null,
      latestRuntimeEventDetail: latestRuntimeEvent?.detail ?? null,
      status: status.status,
      statusReason: status.reason,
      statusSource: status.source,
      purpose: warrant.purpose,
      capabilities: warrant.capabilities.map(
        (capability) => capabilityLabels[capability],
      ),
      constraints: formatConstraintFields(warrant.resourceConstraints),
      createdAt: warrant.createdAt,
      expiresAt: warrant.expiresAt,
      canDelegate: warrant.canDelegate,
      maxChildren: warrant.maxChildren,
      revokedAt: warrant.revokedAt,
      revocationReason: warrant.revocationReason,
      latestAction,
      latestPolicyDenial,
      latestApproval,
      pendingApproval,
    };
  });
}

export function createActionAttemptDisplayRecords(
  scenario: DemoScenario,
): ActionAttemptDisplayRecord[] {
  const agentsById = new Map(scenario.agents.map((agent) => [agent.id, agent]));
  const latestRuntimeDecisionByActionId = getLatestRecordsByKey(
    scenario.controlDecisions,
    (decision) => decision.actionId,
    (decision) => decision.at,
    (decision) => decision.proposalId,
  );

  return scenario.actionAttempts.map((action) => ({
    ...bindRuntimeDecisionToAction(action.id, latestRuntimeDecisionByActionId.get(action.id)),
    id: action.id,
    kind: action.kind,
    agentId: action.agentId,
    agentLabel: required(
      agentsById.get(action.agentId),
      `Missing agent for action ${action.id}`,
    ).label,
    runtimeActorId:
      latestRuntimeDecisionByActionId.get(action.id)?.runtimeActorId ??
      required(agentsById.get(action.agentId), `Missing agent for action ${action.id}`).runtimeActorId,
    rootRequestId: action.rootRequestId,
    warrantId: action.warrantId,
    parentWarrantId: action.parentWarrantId,
    requestedAt: action.requestedAt,
    summary: action.summary,
    resource: action.resource,
    outcome: action.outcome,
    controlState: mapActionOutcomeToControlState({
      outcome: action.outcome,
      authorizationCode: action.authorization.code,
      providerState: action.providerState ?? null,
    }),
    outcomeReason: action.outcomeReason,
    authorization: action.authorization,
    approvalRequestId: action.approvalRequestId ?? null,
    providerState: action.providerState ?? null,
    providerHeadline: action.providerHeadline ?? null,
    providerDetail: action.providerDetail ?? null,
  }));
}

export function createApprovalStateDisplayRecords(
  scenario: DemoScenario,
): ApprovalStateDisplayRecord[] {
  const agentsById = new Map(scenario.agents.map((agent) => [agent.id, agent]));

  return scenario.approvals.map((approval) => ({
    id: approval.id,
    actionId: approval.actionId,
    warrantId: approval.warrantId,
    requestedByAgentId: approval.requestedByAgentId,
    requestedByLabel: required(
      agentsById.get(approval.requestedByAgentId),
      `Missing agent for approval ${approval.id}`,
    ).label,
    status: approval.status,
    controlState: approvalStatusControlStateMap[approval.status],
    title: approval.title,
    reason: approval.reason,
    preview: approval.preview,
    requestedAt: approval.requestedAt,
    expiresAt: approval.expiresAt,
    decidedAt: approval.decidedAt,
    affectedRecipients: [...approval.affectedRecipients],
    blastRadius: approval.blastRadius,
    provider: approval.provider,
  }));
}

export function createTimelineEventDisplayRecords(
  scenario: DemoScenario,
): TimelineEventDisplayRecord[] {
  const agentLabelsById = new Map(scenario.agents.map((agent) => [agent.id, agent.label]));
  const runtimeActorLabelsById = new Map(
    scenario.agents.map((agent) => [agent.runtimeActorId, agent.runtimeActorLabel]),
  );
  const warrantsById = new Map(scenario.warrants.map((warrant) => [warrant.id, warrant]));
  const actionsById = new Map(
    createActionAttemptDisplayRecords(scenario).map((action) => [action.id, action]),
  );
  const approvalsById = new Map(
    createApprovalStateDisplayRecords(scenario).map((approval) => [approval.id, approval]),
  );
  const scenarioActionIds = new Set(actionsById.keys());
  const latestRuntimeDecisionByActionId = getLatestRecordsByKey(
    scenario.controlDecisions.filter((decision) =>
      scenarioActionIds.has(decision.actionId),
    ),
    (decision) => decision.actionId,
    (decision) => decision.at,
    (decision) => decision.proposalId,
  );
  const latestRuntimeEventByActionId = getLatestRecordsByKey(
    scenario.runtimeEvents.filter(
      (event) => event.actionId !== null && scenarioActionIds.has(event.actionId),
    ),
    (event) => event.actionId,
    (event) => event.at,
    (event) => event.id,
  );

  return [...scenario.timeline]
    .sort((left, right) => {
      const atComparison = left.at.localeCompare(right.at);

      if (atComparison !== 0) {
        return atComparison;
      }

      return left.id.localeCompare(right.id);
    })
    .map((event) => {
      const runtimeActionId =
        event.actionId ??
        (event.approvalId
          ? approvalsById.get(event.approvalId)?.actionId ?? null
          : null);
      const runtimeDecision = runtimeActionId
        ? latestRuntimeDecisionByActionId.get(runtimeActionId) ?? null
        : null;
      const runtimeEvent = runtimeActionId
        ? latestRuntimeEventByActionId.get(runtimeActionId) ?? null
        : null;
      const runtimeActorId = runtimeDecision?.runtimeActorId ?? runtimeEvent?.runtimeActorId ?? null;
      const runtimeControlState = runtimeDecision
        ? mapRuntimeControlStateToCanonicalState(runtimeDecision.controlState)
        : null;
      const meta = timelineEventMeta[event.kind];
      const controlState = resolveTimelineControlState({
        eventKind: event.kind,
        actionState:
          event.actionId
            ? actionsById.get(event.actionId)?.controlState ?? null
            : null,
        approvalState:
          event.approvalId
            ? approvalsById.get(event.approvalId)?.controlState ?? null
            : null,
        runtimeState: runtimeControlState,
      });
      const lineagePath = event.warrantId
        ? getWarrantLineagePath(event.warrantId, warrantsById, agentLabelsById)
        : [scenario.user.label];
      const warrantLabel = event.warrantId
        ? agentLabelsById.get(warrantsById.get(event.warrantId)?.agentId ?? "") ?? null
        : null;
      const parentWarrantLabel = event.parentWarrantId
        ? agentLabelsById.get(warrantsById.get(event.parentWarrantId)?.agentId ?? "") ?? null
        : null;

      return {
        id: event.id,
        at: event.at,
        kind: event.kind,
        controlState,
        kindLabel: meta.kindLabel,
        resultLabel: meta.resultLabel,
        resultTone:
          event.kind === "scenario.loaded" || event.kind === "warrant.issued"
            ? "info"
            : controlState,
        actorKind: event.actorKind,
        actorId: event.actorId,
        actorLabel:
          event.actorKind === "user"
            ? scenario.user.label
            : event.actorKind === "agent"
              ? agentLabelsById.get(event.actorId) ?? event.actorId
              : "System",
        runtimeActorId,
        runtimeActorLabel: runtimeActorId
          ? runtimeActorLabelsById.get(runtimeActorId) ?? runtimeActorId
          : null,
        warrantId: event.warrantId,
        warrantLabel,
        parentWarrantId: event.parentWarrantId,
        parentWarrantLabel,
        actionId: event.actionId,
        approvalId: event.approvalId,
        revocationId: event.revocationId,
        branchLabel: lineagePath.join(" -> "),
        lineagePath,
        title: event.title,
        description: event.description,
        proposalId: runtimeDecision?.proposalId ?? runtimeEvent?.proposalId ?? null,
        runtimeEventId: runtimeEvent?.id ?? null,
        runtimeTitle: runtimeEvent?.title ?? null,
        runtimeDetail: runtimeEvent?.detail ?? runtimeDecision?.reason ?? null,
        runtimeControlState,
      };
    });
}

function resolveTimelineControlState(input: {
  eventKind: LedgerEventKind;
  actionState: CanonicalControlState | null;
  approvalState: CanonicalControlState | null;
  runtimeState: CanonicalControlState | null;
}): CanonicalControlState {
  if (
    (input.eventKind === "approval.requested" ||
      input.eventKind === "approval.approved" ||
      input.eventKind === "approval.denied") &&
    input.approvalState
  ) {
    return input.approvalState;
  }

  if (
    (input.eventKind === "action.allowed" ||
      input.eventKind === "action.blocked" ||
      input.eventKind === "approval.requested") &&
    input.runtimeState
  ) {
    return input.runtimeState;
  }

  if (input.eventKind === "action.blocked" && input.actionState) {
    return input.actionState;
  }

  return timelineKindControlStateMap[input.eventKind];
}

export function createDelegationGraphView(
  scenario: DemoScenario,
): DelegationGraphDTO {
  const warrantSummaries = createWarrantDisplaySummaries(scenario);

  return {
    nodes: warrantSummaries.map<GraphNodeDTO>((summary) => ({
      id: summary.id,
      agentId: summary.agentId,
      runtimeActorId: summary.runtimeActorId,
      runtimeActorLabel: summary.runtimeActorLabel,
      parentId: summary.parentId,
      label: summary.agentLabel,
      role: summary.agentRole,
      status: summary.status,
      statusReason: summary.statusReason,
      statusSource: summary.statusSource,
      runtimeStatus: summary.latestRuntimeControlState,
      runtimeStatusReason: summary.latestRuntimeControlReason,
      purpose: summary.purpose,
      capabilityBadges: summary.capabilities,
      canDelegate: summary.canDelegate,
      expiresAt: summary.expiresAt,
    })),
    edges: warrantSummaries
      .filter((summary) => summary.parentId)
      .map<GraphEdgeDTO>((summary) => ({
        id: `e-${summary.parentId}-${summary.id}`,
        sourceId: summary.parentId!,
        targetId: summary.id,
        status: summary.status,
      })),
    warrantSummaries,
  };
}

function getLatestRecordsByKey<Record, Key extends string>(
  records: readonly Record[],
  getKey: (record: Record) => Key | null,
  getAt: (record: Record) => string,
  getTieBreakerId: (record: Record) => string,
): Map<Key, Record> {
  const latestByKey = new Map<Key, Record>();

  records.forEach((record) => {
    const key = getKey(record);
    if (!key) {
      return;
    }

    const existing = latestByKey.get(key);
    if (!existing) {
      latestByKey.set(key, record);
      return;
    }

    const atComparison = getAt(record).localeCompare(getAt(existing));
    if (
      atComparison > 0 ||
      (atComparison === 0 &&
        getTieBreakerId(record).localeCompare(getTieBreakerId(existing)) >= 0)
    ) {
      latestByKey.set(key, record);
    }
  });

  return latestByKey;
}

function bindRuntimeDecisionToAction(
  actionId: string,
  decision: RuntimeProposalControlDecision | undefined,
): {
  proposalId: string | null;
  runtimeActorId: string | null;
  runtimeControlState: CanonicalControlState | null;
  runtimeControlReason: string | null;
} {
  if (!decision || decision.actionId !== actionId) {
    return {
      proposalId: null,
      runtimeActorId: null,
      runtimeControlState: null,
      runtimeControlReason: null,
    };
  }

  return {
    proposalId: decision.proposalId,
    runtimeActorId: decision.runtimeActorId ?? null,
    runtimeControlState: mapRuntimeControlStateToCanonicalState(decision.controlState),
    runtimeControlReason: decision.reason,
  };
}

export function getDisplayScenarioExamples(
  scenario: DemoScenario,
): DisplayScenarioExampleSet {
  const actionRecordsById = new Map(
    createActionAttemptDisplayRecords(scenario).map((action) => [action.id, action]),
  );
  const approvalRecordsById = new Map(
    createApprovalStateDisplayRecords(scenario).map((approval) => [approval.id, approval]),
  );
  const warrantSummariesById = new Map(
    createWarrantDisplaySummaries(scenario).map((summary) => [summary.id, summary]),
  );

  return {
    calendarChildWarrant: required(
      warrantSummariesById.get(scenario.examples.calendarChildWarrantId),
      `Missing warrant summary ${scenario.examples.calendarChildWarrantId}`,
    ),
    commsChildWarrant: required(
      warrantSummariesById.get(scenario.examples.commsChildWarrantId),
      `Missing warrant summary ${scenario.examples.commsChildWarrantId}`,
    ),
    calendarAction: required(
      actionRecordsById.get(scenario.examples.calendarActionId),
      `Missing action ${scenario.examples.calendarActionId}`,
    ),
    commsDraftAction: required(
      actionRecordsById.get(scenario.examples.commsDraftActionId),
      `Missing action ${scenario.examples.commsDraftActionId}`,
    ),
    commsOverreachAction: required(
      actionRecordsById.get(scenario.examples.commsOverreachActionId),
      `Missing action ${scenario.examples.commsOverreachActionId}`,
    ),
    commsSendAction: required(
      actionRecordsById.get(scenario.examples.commsSendActionId),
      `Missing action ${scenario.examples.commsSendActionId}`,
    ),
    commsSendApproval: required(
      approvalRecordsById.get(scenario.examples.commsSendApprovalId),
      `Missing approval ${scenario.examples.commsSendApprovalId}`,
    ),
  };
}
