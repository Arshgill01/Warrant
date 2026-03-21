import type {
  ActionKind,
  DelegationNode,
  DemoActionAttempt,
  DemoApprovalRequest,
  DemoScenario,
  LedgerEvent,
  RevocationRecord,
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

const cloneScenario = <Value>(value: Value): Value => structuredClone(value);

const defaultDemoScenario: DemoScenario = {
  id: "demo-scenario-investor-update",
  title: "Investor update for April 18",
  taskPrompt: "Prepare my investor update for tomorrow and coordinate follow-ups.",
  referenceTime: "2026-04-17T09:00:00.000Z",
  targetDate: "2026-04-18",
  timezone: "America/Los_Angeles",
  rootWarrantId: "warrant-planner-root-001",
  user: {
    id: "user-maya-chen",
    label: "Maya Chen",
    email: "maya@northstar.vc",
    timezone: "America/Los_Angeles",
  },
  agents: [
    {
      id: "agent-planner-001",
      role: "planner",
      label: "Planner Agent",
      status: "active",
      purpose: "Break the investor-update request into bounded child-agent tasks.",
      summary: "Owns the root warrant and delegates narrower authority to child agents.",
      warrantId: "warrant-planner-root-001",
      parentAgentId: null,
      externalSystems: ["gmail", "google-calendar", "google-docs"],
    },
    {
      id: "agent-calendar-001",
      role: "calendar",
      label: "Calendar Agent",
      status: "active",
      purpose: "Check tomorrow's schedule before the investor update goes out.",
      summary: "Can read a bounded calendar window for the April 18 follow-up plan.",
      warrantId: "warrant-calendar-child-001",
      parentAgentId: "agent-planner-001",
      externalSystems: ["google-calendar"],
    },
    {
      id: "agent-comms-001",
      role: "comms",
      label: "Comms Agent",
      status: "revoked",
      purpose: "Draft and coordinate investor follow-up emails.",
      summary: "Prepared follow-ups, overreached once, then had its branch revoked by the user.",
      warrantId: "warrant-comms-child-001",
      parentAgentId: "agent-planner-001",
      externalSystems: ["gmail", "google-docs"],
    },
    {
      id: "agent-docs-001",
      role: "docs",
      label: "Docs Agent",
      status: "revoked",
      purpose: "Pull source notes from the investor-update folder for the Comms branch.",
      summary: "Inherited a narrower docs-only warrant and lost access when the Comms branch was revoked.",
      warrantId: "warrant-docs-child-001",
      parentAgentId: "agent-comms-001",
      externalSystems: ["google-docs"],
    },
  ],
  warrants: [
    {
      id: "warrant-planner-root-001",
      parentId: null,
      agentId: "agent-planner-001",
      purpose: "Prepare the April 18 investor update and coordinate bounded follow-ups.",
      capabilities: ["calendar.read", "docs.read", "gmail.draft", "gmail.send", "warrant.issue", "warrant.revoke"],
      resourceConstraints: {
        allowedDomains: ["northstar.vc"],
        allowedRecipients: ["partners@northstar.vc", "finance@northstar.vc"],
        allowedFolderIds: ["folder-investor-update-q2"],
        calendarWindow: "2026-04-18T08:00:00.000Z/2026-04-18T18:00:00.000Z",
        maxSends: 2,
      },
      canDelegate: true,
      maxChildren: 2,
      expiresAt: "2026-04-18T18:00:00.000Z",
      status: "active",
    },
    {
      id: "warrant-calendar-child-001",
      parentId: "warrant-planner-root-001",
      agentId: "agent-calendar-001",
      purpose: "Read the April 18 calendar window for investor-update timing.",
      capabilities: ["calendar.read"],
      resourceConstraints: {
        calendarWindow: "2026-04-18T08:00:00.000Z/2026-04-18T18:00:00.000Z",
      },
      canDelegate: false,
      maxChildren: 0,
      expiresAt: "2026-04-18T12:00:00.000Z",
      status: "active",
    },
    {
      id: "warrant-comms-child-001",
      parentId: "warrant-planner-root-001",
      agentId: "agent-comms-001",
      purpose: "Draft investor follow-ups, request approval for sends, and delegate folder reads to Docs Agent.",
      capabilities: ["docs.read", "gmail.draft", "gmail.send", "warrant.issue"],
      resourceConstraints: {
        allowedDomains: ["northstar.vc"],
        allowedRecipients: ["partners@northstar.vc", "finance@northstar.vc"],
        allowedFolderIds: ["folder-investor-update-q2"],
        maxSends: 2,
      },
      canDelegate: true,
      maxChildren: 1,
      expiresAt: "2026-04-18T12:00:00.000Z",
      status: "revoked",
    },
    {
      id: "warrant-docs-child-001",
      parentId: "warrant-comms-child-001",
      agentId: "agent-docs-001",
      purpose: "Read the investor-update source folder and extract factual notes only.",
      capabilities: ["docs.read"],
      resourceConstraints: {
        allowedFolderIds: ["folder-investor-update-q2"],
      },
      canDelegate: false,
      maxChildren: 0,
      expiresAt: "2026-04-17T18:00:00.000Z",
      status: "revoked",
    },
  ],
  actionAttempts: [
    {
      id: "action-calendar-read-001",
      kind: "calendar.read",
      agentId: "agent-calendar-001",
      warrantId: "warrant-calendar-child-001",
      parentWarrantId: "warrant-planner-root-001",
      createdAt: "2026-04-17T09:05:00.000Z",
      summary: "Reviewed tomorrow's availability before drafting the investor update.",
      resource: "Calendar window for April 18",
      outcome: "allowed",
      outcomeReason: "The calendar child warrant allows read access inside the April 18 time window.",
    },
    {
      id: "action-comms-send-overreach-001",
      kind: "gmail.send",
      agentId: "agent-comms-001",
      warrantId: "warrant-comms-child-001",
      parentWarrantId: "warrant-planner-root-001",
      createdAt: "2026-04-17T09:08:00.000Z",
      summary: "Tried to include an external press contact in the investor follow-up loop.",
      resource: "Email to press@techdaily.com",
      outcome: "blocked",
      outcomeReason: "The recipient domain techdaily.com is outside the warrant's allowed investor-recipient list.",
    },
    {
      id: "action-comms-send-followups-001",
      kind: "gmail.send",
      agentId: "agent-comms-001",
      warrantId: "warrant-comms-child-001",
      parentWarrantId: "warrant-planner-root-001",
      createdAt: "2026-04-17T09:10:00.000Z",
      summary: "Prepared two investor follow-up emails and requested approval before sending.",
      resource: "Emails to partners@northstar.vc and finance@northstar.vc",
      outcome: "approval-required",
      outcomeReason: "Sending email is inside the warrant but requires explicit human approval before it can leave the system.",
      approvalRequestId: "approval-comms-send-001",
    },
    {
      id: "action-docs-read-after-revoke-001",
      kind: "docs.read",
      agentId: "agent-docs-001",
      warrantId: "warrant-docs-child-001",
      parentWarrantId: "warrant-comms-child-001",
      createdAt: "2026-04-17T09:13:00.000Z",
      summary: "Attempted to reopen the investor-update folder after the Comms branch had been revoked.",
      resource: "Folder folder-investor-update-q2",
      outcome: "blocked",
      outcomeReason: "The ancestor Comms warrant was revoked, so the descendant docs warrant is no longer valid.",
    },
  ],
  approvals: [
    {
      id: "approval-comms-send-001",
      actionId: "action-comms-send-followups-001",
      requestedByAgentId: "agent-comms-001",
      warrantId: "warrant-comms-child-001",
      title: "Approve investor follow-up send",
      reason: "These emails will leave the system and reach real investors.",
      status: "pending",
      preview: "Send two prepared follow-up emails to partners@northstar.vc and finance@northstar.vc.",
      requestedAt: "2026-04-17T09:10:00.000Z",
      expiresAt: "2026-04-17T10:10:00.000Z",
      decidedAt: null,
      affectedRecipients: ["partners@northstar.vc", "finance@northstar.vc"],
      blastRadius: "Two investors will receive the update immediately if the send is approved.",
    },
  ],
  revocations: [
    {
      id: "revocation-comms-001",
      warrantId: "warrant-comms-child-001",
      parentWarrantId: "warrant-planner-root-001",
      revokedByKind: "user",
      revokedById: "user-maya-chen",
      revokedAt: "2026-04-17T09:12:00.000Z",
      reason: "The user revoked the Comms branch after an overreach attempt before approving outbound sends.",
      cascadedWarrantIds: ["warrant-docs-child-001"],
    },
  ],
  timeline: [
    {
      id: "event-scenario-loaded-001",
      at: "2026-04-17T09:00:00.000Z",
      kind: "scenario.loaded",
      actorKind: "user",
      actorId: "user-maya-chen",
      warrantId: null,
      parentWarrantId: null,
      actionId: null,
      approvalId: null,
      revocationId: null,
      title: "Demo scenario loaded",
      description: "Maya Chen starts the prompt to prepare the April 18 investor update and coordinate follow-ups.",
    },
    {
      id: "event-root-warrant-issued-001",
      at: "2026-04-17T09:01:00.000Z",
      kind: "warrant.issued",
      actorKind: "user",
      actorId: "user-maya-chen",
      warrantId: "warrant-planner-root-001",
      parentWarrantId: null,
      actionId: null,
      approvalId: null,
      revocationId: null,
      title: "Root planner warrant activated",
      description: "The user authorizes the Planner Agent to coordinate the investor update inside bounded Gmail, Calendar, and Docs limits.",
    },
    {
      id: "event-calendar-warrant-issued-001",
      at: "2026-04-17T09:02:00.000Z",
      kind: "warrant.issued",
      actorKind: "agent",
      actorId: "agent-planner-001",
      warrantId: "warrant-calendar-child-001",
      parentWarrantId: "warrant-planner-root-001",
      actionId: null,
      approvalId: null,
      revocationId: null,
      title: "Calendar child warrant issued",
      description: "Planner Agent delegates a narrow calendar-read warrant for the April 18 scheduling window.",
    },
    {
      id: "event-comms-warrant-issued-001",
      at: "2026-04-17T09:03:00.000Z",
      kind: "warrant.issued",
      actorKind: "agent",
      actorId: "agent-planner-001",
      warrantId: "warrant-comms-child-001",
      parentWarrantId: "warrant-planner-root-001",
      actionId: null,
      approvalId: null,
      revocationId: null,
      title: "Comms child warrant issued",
      description: "Planner Agent delegates bounded email drafting and approval-gated send authority for investor follow-ups.",
    },
    {
      id: "event-docs-warrant-issued-001",
      at: "2026-04-17T09:04:00.000Z",
      kind: "warrant.issued",
      actorKind: "agent",
      actorId: "agent-comms-001",
      warrantId: "warrant-docs-child-001",
      parentWarrantId: "warrant-comms-child-001",
      actionId: null,
      approvalId: null,
      revocationId: null,
      title: "Docs descendant warrant issued",
      description: "Comms Agent narrows its authority again and grants Docs Agent read-only access to the investor-update folder.",
    },
    {
      id: "event-calendar-action-allowed-001",
      at: "2026-04-17T09:05:00.000Z",
      kind: "action.allowed",
      actorKind: "agent",
      actorId: "agent-calendar-001",
      warrantId: "warrant-calendar-child-001",
      parentWarrantId: "warrant-planner-root-001",
      actionId: "action-calendar-read-001",
      approvalId: null,
      revocationId: null,
      title: "Calendar Agent completes a valid child action",
      description: "Calendar Agent reads tomorrow's availability inside its time-bounded warrant and returns scheduling context for the update.",
    },
    {
      id: "event-comms-action-blocked-001",
      at: "2026-04-17T09:08:00.000Z",
      kind: "action.blocked",
      actorKind: "agent",
      actorId: "agent-comms-001",
      warrantId: "warrant-comms-child-001",
      parentWarrantId: "warrant-planner-root-001",
      actionId: "action-comms-send-overreach-001",
      approvalId: null,
      revocationId: null,
      title: "Comms Agent overreach is blocked",
      description: "A send attempt to press@techdaily.com is denied because the Comms warrant only allows investor recipients at northstar.vc.",
    },
    {
      id: "event-approval-requested-001",
      at: "2026-04-17T09:10:00.000Z",
      kind: "approval.requested",
      actorKind: "agent",
      actorId: "agent-comms-001",
      warrantId: "warrant-comms-child-001",
      parentWarrantId: "warrant-planner-root-001",
      actionId: "action-comms-send-followups-001",
      approvalId: "approval-comms-send-001",
      revocationId: null,
      title: "Approval requested for investor follow-up send",
      description: "Comms Agent prepares allowed follow-up emails, but the send remains pending until Maya approves it.",
    },
    {
      id: "event-comms-revoked-001",
      at: "2026-04-17T09:12:00.000Z",
      kind: "warrant.revoked",
      actorKind: "user",
      actorId: "user-maya-chen",
      warrantId: "warrant-comms-child-001",
      parentWarrantId: "warrant-planner-root-001",
      actionId: null,
      approvalId: null,
      revocationId: "revocation-comms-001",
      title: "User revokes the Comms branch",
      description: "Maya revokes the Comms warrant after the overreach attempt, which also invalidates the Docs descendant warrant immediately.",
    },
    {
      id: "event-docs-action-blocked-001",
      at: "2026-04-17T09:13:00.000Z",
      kind: "action.blocked",
      actorKind: "agent",
      actorId: "agent-docs-001",
      warrantId: "warrant-docs-child-001",
      parentWarrantId: "warrant-comms-child-001",
      actionId: "action-docs-read-after-revoke-001",
      approvalId: null,
      revocationId: "revocation-comms-001",
      title: "Descendant docs access is cut off",
      description: "Docs Agent tries to read the investor-update folder again, but the request is blocked because its ancestor branch was revoked.",
    },
  ],
  examples: {
    validChildActionId: "action-calendar-read-001",
    blockedOverreachActionId: "action-comms-send-overreach-001",
    approvalPendingActionId: "action-comms-send-followups-001",
    approvalPendingRequestId: "approval-comms-send-001",
    revokedBranchActionId: "action-docs-read-after-revoke-001",
    revokedBranchRecordId: "revocation-comms-001",
  },
};

export interface DemoScenarioExampleSet {
  validChildAction: DemoActionAttempt;
  blockedOverreachAction: DemoActionAttempt;
  approvalPendingAction: DemoActionAttempt;
  approvalPendingRequest: DemoApprovalRequest;
  revokedBranchAction: DemoActionAttempt;
  revokedBranchRecord: RevocationRecord;
}

export const DEFAULT_DEMO_SCENARIO_ID = defaultDemoScenario.id;

export function createDefaultDemoScenario(): DemoScenario {
  return cloneScenario(defaultDemoScenario);
}

export function createDelegationNodes(scenario: DemoScenario): DelegationNode[] {
  const agentsById = new Map(scenario.agents.map((agent) => [agent.id, agent]));

  return scenario.warrants.map((warrant) => {
    const agent = required(agentsById.get(warrant.agentId), `Missing agent for warrant ${warrant.id}`);

    return {
      warrantId: warrant.id,
      agentId: warrant.agentId,
      parentWarrantId: warrant.parentId,
      status: agent.status,
      capabilitySummary: warrant.capabilities.map((capability) => capabilityLabels[capability]),
    };
  });
}

export function createTimelineEvents(scenario: DemoScenario): LedgerEvent[] {
  return [...scenario.timeline].sort((left, right) => left.at.localeCompare(right.at));
}

export function getScenarioExamples(scenario: DemoScenario): DemoScenarioExampleSet {
  const actionsById = new Map(scenario.actionAttempts.map((action) => [action.id, action]));
  const approvalsById = new Map(scenario.approvals.map((approval) => [approval.id, approval]));
  const revocationsById = new Map(scenario.revocations.map((revocation) => [revocation.id, revocation]));

  return {
    validChildAction: required(
      actionsById.get(scenario.examples.validChildActionId),
      `Missing example action ${scenario.examples.validChildActionId}`,
    ),
    blockedOverreachAction: required(
      actionsById.get(scenario.examples.blockedOverreachActionId),
      `Missing example action ${scenario.examples.blockedOverreachActionId}`,
    ),
    approvalPendingAction: required(
      actionsById.get(scenario.examples.approvalPendingActionId),
      `Missing example action ${scenario.examples.approvalPendingActionId}`,
    ),
    approvalPendingRequest: required(
      approvalsById.get(scenario.examples.approvalPendingRequestId),
      `Missing example approval ${scenario.examples.approvalPendingRequestId}`,
    ),
    revokedBranchAction: required(
      actionsById.get(scenario.examples.revokedBranchActionId),
      `Missing example action ${scenario.examples.revokedBranchActionId}`,
    ),
    revokedBranchRecord: required(
      revocationsById.get(scenario.examples.revokedBranchRecordId),
      `Missing example revocation ${scenario.examples.revokedBranchRecordId}`,
    ),
  };
}
