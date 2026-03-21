import type {
  ActionAttemptDisplayRecord,
  ActionKind,
  ApprovalStateDisplayRecord,
  DelegationGraphEdgeRecord,
  DelegationGraphNodeRecord,
  DemoScenario,
  DisplayField,
  DisplayStatus,
  TimelineEventDisplayRecord,
  WarrantDisplaySummary,
} from "@/contracts";

const capabilityLabels: Record<ActionKind, string> = {
  "calendar.read": "Read calendar",
  "calendar.schedule": "Schedule meetings",
  "docs.read": "Read docs",
  "gmail.draft": "Draft email",
  "gmail.send": "Send email",
  "warrant.issue": "Delegate child warrants",
  "warrant.revoke": "Revoke warrants",
};

const required = <Value>(value: Value | undefined, message: string): Value => {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
};

export interface DelegationGraphViewData {
  nodes: DelegationGraphNodeRecord[];
  edges: DelegationGraphEdgeRecord[];
  warrantSummaries: WarrantDisplaySummary[];
}

export interface DisplayScenarioExampleSet {
  validChildAction: ActionAttemptDisplayRecord;
  blockedOverreachAction: ActionAttemptDisplayRecord;
  approvalPendingAction: ActionAttemptDisplayRecord;
  approvalPendingRequest: ApprovalStateDisplayRecord;
  revokedBranchSummary: WarrantDisplaySummary;
  revokedDescendantCount: number;
}

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

function hasPendingApproval(scenario: DemoScenario, warrantId: string): boolean {
  return scenario.approvals.some(
    (approval) => approval.warrantId === warrantId && approval.status === "pending",
  );
}

function resolveDisplayStatus(input: {
  agentStatus: DemoScenario["agents"][number]["status"];
  warrantStatus: DemoScenario["warrants"][number]["status"];
  hasPendingApproval: boolean;
}): DisplayStatus {
  if (input.warrantStatus === "revoked") {
    return "revoked";
  }

  if (input.warrantStatus === "expired") {
    return "expired";
  }

  if (input.agentStatus === "blocked") {
    return "blocked";
  }

  if (input.hasPendingApproval) {
    return "pending";
  }

  if (input.agentStatus === "idle") {
    return "idle";
  }

  return "active";
}

export function createWarrantDisplaySummaries(
  scenario: DemoScenario,
): WarrantDisplaySummary[] {
  const agentsById = new Map(scenario.agents.map((agent) => [agent.id, agent]));

  return scenario.warrants.map((warrant) => {
    const agent = required(
      agentsById.get(warrant.agentId),
      `Missing agent for warrant ${warrant.id}`,
    );

    return {
      id: warrant.id,
      parentId: warrant.parentId,
      rootRequestId: warrant.rootRequestId,
      agentId: warrant.agentId,
      agentLabel: agent.label,
      agentRole: agent.role,
      status: resolveDisplayStatus({
        agentStatus: agent.status,
        warrantStatus: warrant.status,
        hasPendingApproval: hasPendingApproval(scenario, warrant.id),
      }),
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
    warrantId: action.warrantId,
    parentWarrantId: action.parentWarrantId,
    requestedAt: action.requestedAt,
    summary: action.summary,
    resource: action.resource,
    outcome: action.outcome,
    outcomeReason: action.outcomeReason,
    approvalRequestId: action.approvalRequestId ?? null,
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
  }));
}

export function createTimelineEventDisplayRecords(
  scenario: DemoScenario,
): TimelineEventDisplayRecord[] {
  const agentLabelsById = new Map(scenario.agents.map((agent) => [agent.id, agent.label]));

  return [...scenario.timeline]
    .sort((left, right) => left.at.localeCompare(right.at))
    .map((event) => ({
      id: event.id,
      at: event.at,
      kind: event.kind,
      actorKind: event.actorKind,
      actorId: event.actorId,
      actorLabel:
        event.actorKind === "user"
          ? scenario.user.label
          : event.actorKind === "agent"
            ? agentLabelsById.get(event.actorId) ?? event.actorId
            : "System",
      warrantId: event.warrantId,
      parentWarrantId: event.parentWarrantId,
      actionId: event.actionId,
      approvalId: event.approvalId,
      revocationId: event.revocationId,
      title: event.title,
      description: event.description,
    }));
}

export function createDelegationGraphView(
  scenario: DemoScenario,
): DelegationGraphViewData {
  const warrantSummaries = createWarrantDisplaySummaries(scenario);

  return {
    nodes: warrantSummaries.map((summary) => ({
      id: summary.id,
      agentId: summary.agentId,
      parentId: summary.parentId,
      label: summary.agentLabel,
      role: summary.agentRole,
      status: summary.status,
      purpose: summary.purpose,
      capabilityBadges: summary.capabilities,
      canDelegate: summary.canDelegate,
      expiresAt: summary.expiresAt,
    })),
    edges: warrantSummaries
      .filter((summary) => summary.parentId)
      .map((summary) => ({
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
  const revokedBranchId = required(
    scenario.revocations.find((revocation) => revocation.id === scenario.examples.revokedBranchRecordId),
    `Missing revocation ${scenario.examples.revokedBranchRecordId}`,
  ).warrantId;

  return {
    validChildAction: required(
      actionRecordsById.get(scenario.examples.validChildActionId),
      `Missing action ${scenario.examples.validChildActionId}`,
    ),
    blockedOverreachAction: required(
      actionRecordsById.get(scenario.examples.blockedOverreachActionId),
      `Missing action ${scenario.examples.blockedOverreachActionId}`,
    ),
    approvalPendingAction: required(
      actionRecordsById.get(scenario.examples.approvalPendingActionId),
      `Missing action ${scenario.examples.approvalPendingActionId}`,
    ),
    approvalPendingRequest: required(
      approvalRecordsById.get(scenario.examples.approvalPendingRequestId),
      `Missing approval ${scenario.examples.approvalPendingRequestId}`,
    ),
    revokedBranchSummary: required(
      warrantSummariesById.get(revokedBranchId),
      `Missing warrant summary ${revokedBranchId}`,
    ),
    revokedDescendantCount: required(
      scenario.revocations.find((revocation) => revocation.id === scenario.examples.revokedBranchRecordId),
      `Missing revocation ${scenario.examples.revokedBranchRecordId}`,
    ).cascadedWarrantIds.length,
  };
}
