import type {
  ActionAttemptDisplayRecord,
  ActionKind,
  ApprovalStateDisplayRecord,
  DelegationGraphDTO,
  DemoScenario,
  DisplayField,
  DisplayScenarioExampleSet,
  DisplayStatus,
  GraphEdgeDTO,
  GraphNodeDTO,
  TimelineEventDisplayRecord,
  TimelineEventTone,
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
    resultTone: TimelineEventTone;
  }
> = {
  "scenario.loaded": {
    kindLabel: "Scenario",
    resultLabel: "Loaded",
    resultTone: "info",
  },
  "warrant.issued": {
    kindLabel: "Warrant",
    resultLabel: "Issued",
    resultTone: "info",
  },
  "action.allowed": {
    kindLabel: "Action",
    resultLabel: "Completed",
    resultTone: "allowed",
  },
  "action.blocked": {
    kindLabel: "Action",
    resultLabel: "Blocked",
    resultTone: "blocked",
  },
  "approval.requested": {
    kindLabel: "Approval",
    resultLabel: "Requested",
    resultTone: "pending",
  },
  "approval.approved": {
    kindLabel: "Approval",
    resultLabel: "Approved",
    resultTone: "approved",
  },
  "approval.denied": {
    kindLabel: "Approval",
    resultLabel: "Denied",
    resultTone: "blocked",
  },
  "warrant.revoked": {
    kindLabel: "Branch",
    resultLabel: "Revoked",
    resultTone: "revoked",
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
  return (
    record.outcome === "blocked" &&
    record.providerState === null &&
    record.authorization.code !== "warrant_revoked" &&
    record.authorization.code !== "ancestor_revoked"
  );
}

function getLatestRecordsByWarrantId<Record extends { warrantId: string; requestedAt?: string; expiresAt?: string }>(
  records: Record[],
  getAt: (record: Record) => string,
): Map<string, Record> {
  const latestByWarrantId = new Map<string, Record>();

  records.forEach((record) => {
    const existing = latestByWarrantId.get(record.warrantId);

    if (!existing || getAt(record).localeCompare(getAt(existing)) > 0) {
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
  pendingApproval: ApprovalStateDisplayRecord | null;
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

  if (
    input.pendingApproval ||
    input.latestAction?.outcome === "approval-required"
  ) {
    return {
      status: "pending-approval",
      reason:
        input.pendingApproval?.reason ??
        input.latestAction?.outcomeReason ??
        "This branch is waiting for human approval before it can continue.",
      source: "approval",
    };
  }

  if (
    input.latestAction?.outcome === "blocked" &&
    input.latestAction.providerState === null
  ) {
    return {
      status: "denied",
      reason: input.latestAction.outcomeReason,
      source: "action",
    };
  }

  if (
    input.agentStatus === "blocked" ||
    (input.latestAction?.providerState !== null &&
      input.latestAction?.providerState !== undefined &&
      input.latestAction.providerState !== "success")
  ) {
    return {
      status: "blocked",
      reason:
        input.latestAction?.providerDetail ??
        input.latestAction?.providerHeadline ??
        input.latestAction?.outcomeReason ??
        "This branch is currently blocked from continuing.",
      source:
        input.latestAction?.providerState &&
        input.latestAction.providerState !== "success"
          ? "provider"
          : "agent",
    };
  }

  if (input.agentStatus === "idle") {
    return {
      status: "idle",
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
  const latestActionByWarrantId = getLatestRecordsByWarrantId(
    actionRecords,
    (record) => record.requestedAt,
  );
  const latestPolicyDenialByWarrantId = getLatestRecordsByWarrantId(
    actionRecords.filter(isPolicyDeniedAction),
    (record) => record.requestedAt,
  );
  const pendingApprovalByWarrantId = getLatestRecordsByWarrantId(
    approvalRecords.filter((approval) => approval.status === "pending"),
    (record) => record.requestedAt,
  );
  const latestApprovalByWarrantId = getLatestRecordsByWarrantId(
    approvalRecords,
    (record) => record.decidedAt ?? record.requestedAt,
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
    const pendingApproval = pendingApprovalByWarrantId.get(warrant.id) ?? null;
    const status = resolveDisplayStatus({
      agentStatus: agent.status,
      warrantStatus: warrant.status,
      expiresAt: warrant.expiresAt,
      revocationReason: warrant.revocationReason,
      pendingApproval,
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
      latestApproval: latestApprovalByWarrantId.get(warrant.id) ?? null,
      pendingApproval,
    };
  });
}

export function createActionAttemptDisplayRecords(
  scenario: DemoScenario,
): ActionAttemptDisplayRecord[] {
  const agentsById = new Map(scenario.agents.map((agent) => [agent.id, agent]));

  return scenario.actionAttempts.map((action) => ({
    id: action.id,
    kind: action.kind,
    agentId: action.agentId,
    agentLabel: required(
      agentsById.get(action.agentId),
      `Missing agent for action ${action.id}`,
    ).label,
    rootRequestId: action.rootRequestId,
    warrantId: action.warrantId,
    parentWarrantId: action.parentWarrantId,
    requestedAt: action.requestedAt,
    summary: action.summary,
    resource: action.resource,
    outcome: action.outcome,
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
  const warrantsById = new Map(scenario.warrants.map((warrant) => [warrant.id, warrant]));

  return [...scenario.timeline]
    .sort((left, right) => left.at.localeCompare(right.at))
    .map((event) => {
      const meta = timelineEventMeta[event.kind];
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
        kindLabel: meta.kindLabel,
        resultLabel: meta.resultLabel,
        resultTone: meta.resultTone,
        actorKind: event.actorKind,
        actorId: event.actorId,
        actorLabel:
          event.actorKind === "user"
            ? scenario.user.label
            : event.actorKind === "agent"
              ? agentLabelsById.get(event.actorId) ?? event.actorId
              : "System",
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
      };
    });
}

export function createDelegationGraphView(
  scenario: DemoScenario,
): DelegationGraphDTO {
  const warrantSummaries = createWarrantDisplaySummaries(scenario);

  return {
    nodes: warrantSummaries.map<GraphNodeDTO>((summary) => ({
      id: summary.id,
      agentId: summary.agentId,
      parentId: summary.parentId,
      label: summary.agentLabel,
      role: summary.agentRole,
      status: summary.status,
      statusReason: summary.statusReason,
      statusSource: summary.statusSource,
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
