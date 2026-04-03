import type {
  ActionAttempt,
  DemoAgent,
  DemoScenario,
  DemoUser,
  LedgerEvent,
  RevocationRecord,
  WarrantContract,
} from "@/contracts";
import {
  createDeterministicScenarioActionAdapters,
  executeCalendarReadAction,
  executeGmailDraftAction,
  executeGmailSendAction,
  executeGmailSendOverreachAction,
  type ScenarioActionAdapters,
} from "@/actions";
import {
  createSendApprovalRequest,
  decideApprovalRequest,
} from "@/approvals";
import {
  authorizeAction,
  issueChildWarrant,
  issueRootWarrant,
  revokeWarrantBranch,
} from "@/warrants";
import type {
  MainScenarioRunResult,
  MainScenarioStage,
  PlannerTaskRecord,
} from "@/agents/types";

const SCENARIO_ID = "demo-scenario-investor-update";
const ROOT_REQUEST_ID = "request-investor-update-001";
const REFERENCE_TIME = "2026-04-17T09:00:00.000Z";
const TARGET_DATE = "2026-04-18";
const TIMEZONE = "America/Los_Angeles";

const scenarioUser: DemoUser = {
  id: "user-maya-chen",
  label: "Maya Chen",
  email: "maya@northstar.vc",
  timezone: TIMEZONE,
};

function buildPlannerAgent(): Omit<DemoAgent, "warrantId"> {
  return {
    id: "agent-planner-001",
    role: "planner",
    label: "Planner Agent",
    status: "active",
    purpose: "Turn Maya's request into narrower child-agent tasks.",
    summary:
      "Holds the parent warrant, decides the plan, and delegates only the minimum authority each child needs.",
    parentAgentId: null,
    externalSystems: ["gmail", "google-calendar"],
  };
}

function buildCalendarAgent(): Omit<DemoAgent, "warrantId"> {
  return {
    id: "agent-calendar-001",
    role: "calendar",
    label: "Calendar Agent",
    status: "active",
    purpose: "Check tomorrow's schedule before the investor update goes out.",
    summary:
      "Can read one bounded calendar window. It cannot draft emails or send them.",
    parentAgentId: "agent-planner-001",
    externalSystems: ["google-calendar"],
  };
}

function buildCommsAgent(): Omit<DemoAgent, "warrantId"> {
  return {
    id: "agent-comms-001",
    role: "comms",
    label: "Comms Agent",
    status: "active",
    purpose: "Draft investor follow-up emails and queue one bounded send for approval.",
    summary:
      "Can draft for approved Northstar recipients and request one send. It cannot send a real email without approval.",
    parentAgentId: "agent-planner-001",
    externalSystems: ["gmail"],
  };
}

function createScenarioLoadedEvent(): LedgerEvent {
  return {
    id: "event-scenario-loaded-001",
    at: REFERENCE_TIME,
    kind: "scenario.loaded",
    actorKind: "user",
    actorId: scenarioUser.id,
    warrantId: null,
    parentWarrantId: null,
    actionId: null,
    approvalId: null,
    revocationId: null,
    title: "Main scenario loaded",
    description:
      "Maya asks Warrant to prepare tomorrow's investor update and coordinate follow-ups through a constrained agent tree.",
  };
}

function createWarrantIssuedEvent(input: {
  id: string;
  at: string;
  actorKind: "user" | "agent";
  actorId: string;
  warrant: WarrantContract;
  title: string;
  description: string;
}): LedgerEvent {
  return {
    id: input.id,
    at: input.at,
    kind: "warrant.issued",
    actorKind: input.actorKind,
    actorId: input.actorId,
    warrantId: input.warrant.id,
    parentWarrantId: input.warrant.parentId,
    actionId: null,
    approvalId: null,
    revocationId: null,
    title: input.title,
    description: input.description,
  };
}

function createApprovalEvent(input: {
  id: string;
  at: string;
  kind: "approval.requested" | "approval.approved" | "approval.denied";
  actorKind: "user" | "agent";
  actorId: string;
  warrant: WarrantContract;
  actionId: string;
  approvalId: string;
  title: string;
  description: string;
}): LedgerEvent {
  return {
    id: input.id,
    at: input.at,
    kind: input.kind,
    actorKind: input.actorKind,
    actorId: input.actorId,
    warrantId: input.warrant.id,
    parentWarrantId: input.warrant.parentId,
    actionId: input.actionId,
    approvalId: input.approvalId,
    revocationId: null,
    title: input.title,
    description: input.description,
  };
}

function createRevocationRecord(input: {
  id: string;
  warrant: WarrantContract;
  revokedAt: string;
  reason: string;
  cascadedWarrantIds: string[];
}): RevocationRecord {
  return {
    id: input.id,
    warrantId: input.warrant.id,
    parentWarrantId: input.warrant.parentId,
    revokedByKind: "user",
    revokedById: scenarioUser.id,
    revokedAt: input.revokedAt,
    reason: input.reason,
    cascadedWarrantIds: input.cascadedWarrantIds,
  };
}

function createRevocationEvent(input: {
  revocation: RevocationRecord;
  warrant: WarrantContract;
  title: string;
  description: string;
}): LedgerEvent {
  return {
    id: `event-${input.revocation.id}`,
    at: input.revocation.revokedAt,
    kind: "warrant.revoked",
    actorKind: input.revocation.revokedByKind,
    actorId: input.revocation.revokedById,
    warrantId: input.warrant.id,
    parentWarrantId: input.warrant.parentId,
    actionId: null,
    approvalId: null,
    revocationId: input.revocation.id,
    title: input.title,
    description: input.description,
  };
}

function requireIssuedWarrant(result: ReturnType<typeof issueChildWarrant>): WarrantContract {
  if (!result.ok) {
    throw new Error(result.reason.message);
  }

  return result.warrant;
}

interface MainScenarioRunOptions {
  stage?: MainScenarioStage;
}

export function runMainScenarioPlannerFlow(
  adapters: ScenarioActionAdapters = createDeterministicScenarioActionAdapters(),
  options: MainScenarioRunOptions = {},
): MainScenarioRunResult {
  const stage = options.stage ?? "comms-revoked";
  const plannerAgent = buildPlannerAgent();
  const calendarAgent = buildCalendarAgent();
  const commsAgent = buildCommsAgent();

  const rootWarrant = issueRootWarrant({
    id: "warrant-planner-root-001",
    rootRequestId: ROOT_REQUEST_ID,
    createdBy: scenarioUser.id,
    agentId: plannerAgent.id,
    purpose:
      "Prepare the April 18 investor update and delegate only narrower scheduling and email authority.",
    capabilities: [
      "calendar.read",
      "gmail.draft",
      "gmail.send",
      "warrant.issue",
    ],
    resourceConstraints: {
      allowedDomains: ["northstar.vc"],
      allowedRecipients: [
        "partners@northstar.vc",
        "finance@northstar.vc",
      ],
      calendarWindow: {
        startsAt: "2026-04-18T08:00:00.000Z",
        endsAt: "2026-04-18T18:00:00.000Z",
      },
      maxDrafts: 2,
      maxSends: 2,
    },
    canDelegate: true,
    maxChildren: 2,
    createdAt: "2026-04-17T09:01:00.000Z",
    expiresAt: "2026-04-18T18:00:00.000Z",
  });

  const calendarWarrant = requireIssuedWarrant(
    issueChildWarrant({
      parent: rootWarrant,
      child: {
        id: "warrant-calendar-child-001",
        createdBy: plannerAgent.id,
        agentId: calendarAgent.id,
        purpose: "Read tomorrow's calendar window before follow-up drafting begins.",
        capabilities: ["calendar.read"],
        resourceConstraints: {
          calendarWindow: {
            startsAt: "2026-04-18T08:00:00.000Z",
            endsAt: "2026-04-18T12:00:00.000Z",
          },
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: "2026-04-18T12:00:00.000Z",
      },
      existingChildrenCount: 0,
      now: "2026-04-17T09:02:00.000Z",
    }),
  );

  const commsWarrant = requireIssuedWarrant(
    issueChildWarrant({
      parent: rootWarrant,
      child: {
        id: "warrant-comms-child-001",
        createdBy: plannerAgent.id,
        agentId: commsAgent.id,
        purpose:
          "Draft investor follow-ups for approved recipients and request one send after approval.",
        capabilities: ["gmail.draft", "gmail.send"],
        resourceConstraints: {
          allowedDomains: ["northstar.vc"],
          allowedRecipients: [
            "partners@northstar.vc",
            "finance@northstar.vc",
          ],
          maxDrafts: 2,
          maxSends: 1,
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: "2026-04-18T12:30:00.000Z",
      },
      existingChildrenCount: 1,
      now: "2026-04-17T09:03:00.000Z",
    }),
  );

  const warrants = [rootWarrant, calendarWarrant, commsWarrant];
  const taskPlan: PlannerTaskRecord[] = [
    {
      id: "task-calendar-context-001",
      title: "Check tomorrow's schedule context",
      summary:
        "Planner assigns Calendar Agent one bounded read of the April 18 availability window.",
      assignedAgentId: calendarAgent.id,
      assignedRole: calendarAgent.role,
      requiredCapabilities: ["calendar.read"],
      warrantId: calendarWarrant.id,
      status: "completed",
    },
    {
      id: "task-comms-draft-001",
      title: "Draft investor follow-up emails",
      summary:
        "Planner assigns Comms Agent drafting only for approved Northstar recipients.",
      assignedAgentId: commsAgent.id,
      assignedRole: commsAgent.role,
      requiredCapabilities: ["gmail.draft"],
      warrantId: commsWarrant.id,
      status: "completed",
    },
    {
      id: "task-comms-send-approval-001",
      title: "Send approved investor follow-up emails",
      summary:
        "Comms Agent may execute one bounded Gmail send only after Maya approves the exact message through Auth0.",
      assignedAgentId: commsAgent.id,
      assignedRole: commsAgent.role,
      requiredCapabilities: ["gmail.send"],
      warrantId: commsWarrant.id,
      status: "delegated",
    },
  ];

  const calendarAction = executeCalendarReadAction({
    actionId: "action-calendar-read-001",
    requestedAt: "2026-04-17T09:05:00.000Z",
    warrant: calendarWarrant,
    warrants,
    user: scenarioUser,
    targetDate: TARGET_DATE,
    timezone: TIMEZONE,
    target: {
      scheduledFor: "2026-04-18T10:30:00.000Z",
    },
    adapter: adapters.calendar,
  });

  const commsAction = executeGmailDraftAction({
    actionId: "action-comms-draft-001",
    requestedAt: "2026-04-17T09:07:00.000Z",
    warrant: commsWarrant,
    warrants,
    user: scenarioUser,
    targetDate: TARGET_DATE,
    recipients: ["partners@northstar.vc", "finance@northstar.vc"],
    usage: {
      draftsUsed: 0,
    },
    adapter: adapters.comms,
  });

  const commsOverreach = executeGmailSendOverreachAction({
    actionId: "action-comms-send-overreach-001",
    requestedAt: "2026-04-17T09:08:00.000Z",
    warrant: commsWarrant,
    warrants,
    recipients: ["ceo@external-partner.com"],
    usage: {
      sendsUsed: 0,
    },
  });

  const commsSendRequestedAt = "2026-04-17T09:10:00.000Z";
  const commsSendAction: ActionAttempt = {
    id: "action-comms-send-001",
    kind: "gmail.send",
    agentId: commsWarrant.agentId,
    warrantId: commsWarrant.id,
    requestedAt: commsSendRequestedAt,
    target: {
      recipients: ["partners@northstar.vc", "finance@northstar.vc"],
    },
    usage: {
      sendsUsed: 0,
    },
  };
  const commsSendAuthorization = authorizeAction({
    warrant: commsWarrant,
    warrants,
    action: commsSendAction,
    now: commsSendRequestedAt,
  });

  if (!commsSendAuthorization.allowed) {
    throw new Error(commsSendAuthorization.message);
  }

  const commsSendApproval = createSendApprovalRequest({
    id: "approval-comms-send-001",
    actionId: commsSendAction.id,
    warrantId: commsWarrant.id,
    requestedByAgentId: commsAgent.id,
    title: "Approve investor follow-up send",
    reason:
      "This action would send a real email to other people. Maya must approve this exact message before Warrant can release the send.",
    subject: "Investor update follow-up for April 18",
    bodyText:
      "Prepared follow-up for tomorrow's investor update.\n\nPlease confirm the owners, timing, and next asks before we send externally.",
    to: ["partners@northstar.vc", "finance@northstar.vc"],
    cc: ["maya@northstar.vc"],
    requestedAt: commsSendRequestedAt,
    expiresAt: "2026-04-17T18:00:00.000Z",
    draftId: "draft-investor-update-001",
    blastRadius:
      "If approved, the Comms branch may send this one email to partners@northstar.vc and finance@northstar.vc.",
  });

  const commsSendAttempt = {
    ...commsSendAction,
    rootRequestId: commsSendAuthorization.lineage.rootRequestId,
    parentWarrantId: commsSendAuthorization.lineage.parentWarrantId,
    createdAt: commsSendRequestedAt,
    authorization: {
      allowed: commsSendAuthorization.allowed,
      code: commsSendAuthorization.code,
      message: commsSendAuthorization.message,
      effectiveStatus: commsSendAuthorization.effectiveStatus,
      blockedByWarrantId: null,
    },
    summary:
      "Prepared the investor follow-up send and stopped for approval.",
    resource: "Send to partners@northstar.vc and finance@northstar.vc",
    outcome: "approval-required" as const,
    outcomeReason:
      "This branch is allowed to request one bounded send, but it still cannot send a real email until Maya approves this exact message.",
    approvalRequestId: commsSendApproval.id,
  };

  if (stage === "main") {
    const scenario: DemoScenario = {
      id: SCENARIO_ID,
      title: "Investor update for April 18",
      taskPrompt:
        "Prepare my investor update for tomorrow and coordinate follow-ups.",
      referenceTime: REFERENCE_TIME,
      targetDate: TARGET_DATE,
      timezone: TIMEZONE,
      rootWarrantId: rootWarrant.id,
      user: scenarioUser,
      agents: [
        {
          ...plannerAgent,
          warrantId: rootWarrant.id,
        },
        {
          ...calendarAgent,
          warrantId: calendarWarrant.id,
        },
        {
          ...commsAgent,
          warrantId: commsWarrant.id,
        },
      ],
      warrants,
      actionAttempts: [
        calendarAction.attempt,
        commsAction.attempt,
        commsOverreach.attempt,
        commsSendAttempt,
      ],
      approvals: [commsSendApproval],
      revocations: [],
      timeline: [
        createScenarioLoadedEvent(),
        createWarrantIssuedEvent({
          id: "event-root-warrant-issued-001",
          at: rootWarrant.createdAt,
          actorKind: "user",
          actorId: scenarioUser.id,
          warrant: rootWarrant,
          title: "Root planner warrant activated",
          description:
            "Maya approves the parent warrant for Planner Agent. It may prepare the investor update and delegate only narrower child warrants.",
        }),
        createWarrantIssuedEvent({
          id: "event-calendar-warrant-issued-001",
          at: "2026-04-17T09:02:00.000Z",
          actorKind: "agent",
          actorId: plannerAgent.id,
          warrant: calendarWarrant,
          title: "Calendar child warrant delegated",
          description:
            "Planner Agent delegates one narrower calendar warrant. Calendar Agent may read the April 18 window, but it cannot draft or send email.",
        }),
        createWarrantIssuedEvent({
          id: "event-comms-warrant-issued-001",
          at: "2026-04-17T09:03:00.000Z",
          actorKind: "agent",
          actorId: plannerAgent.id,
          warrant: commsWarrant,
          title: "Comms child warrant delegated",
          description:
            "Planner Agent delegates a narrower comms warrant. Comms Agent may draft immediately and request one send, but it cannot send without approval.",
        }),
        calendarAction.timelineEvent,
        commsAction.timelineEvent,
        commsOverreach.timelineEvent,
        createApprovalEvent({
          id: "event-comms-send-approval-requested-001",
          at: commsSendRequestedAt,
          kind: "approval.requested",
          actorKind: "agent",
          actorId: commsAgent.id,
          warrant: commsWarrant,
          actionId: commsSendAction.id,
          approvalId: commsSendApproval.id,
          title: "Comms send waiting for approval",
          description:
            "Comms Agent stayed inside its warrant, but the real Gmail send is paused until Maya approves this exact email through Auth0.",
        }),
      ],
      examples: {
        calendarChildWarrantId: calendarWarrant.id,
        commsChildWarrantId: commsWarrant.id,
        calendarActionId: calendarAction.attempt.id,
        commsDraftActionId: commsAction.attempt.id,
        commsOverreachActionId: commsOverreach.attempt.id,
        commsSendActionId: commsSendAttempt.id,
        commsSendApprovalId: commsSendApproval.id,
      },
    };

    return {
      scenario,
      taskPlan,
    };
  }

  const commsSendApproved = decideApprovalRequest({
    request: commsSendApproval,
    status: "approved",
    decidedAt: "2026-04-17T09:11:00.000Z",
  });

  const commsApprovedSend = executeGmailSendAction({
    actionId: "action-comms-send-approved-001",
    requestedAt: "2026-04-17T09:12:00.000Z",
    warrant: commsWarrant,
    warrants,
    user: scenarioUser,
    recipients: ["partners@northstar.vc", "finance@northstar.vc"],
    usage: {
      sendsUsed: 0,
    },
    approvalRequestId: commsSendApproved.id,
    adapter: adapters.gmailSend,
  });
  const commsRevocation = revokeWarrantBranch({
    warrants,
    warrantId: commsWarrant.id,
    revokedAt: "2026-04-17T09:13:00.000Z",
    revokedBy: scenarioUser.id,
    reason:
      "Maya revoked the Comms branch after the approved send to prove that delegated authority can be withdrawn immediately.",
  });
  const revocation = createRevocationRecord({
    id: "revocation-comms-001",
    warrant: commsWarrant,
    revokedAt: commsRevocation.events[0]?.metadata.occurredAt ?? "2026-04-17T09:13:00.000Z",
    reason: commsRevocation.events[0]?.metadata.reason ??
      "Maya revoked the Comms branch after the approved send to prove that delegated authority can be withdrawn immediately.",
    cascadedWarrantIds: commsRevocation.revokedWarrantIds,
  });
  const revokedWarrants = commsRevocation.warrants;
  const revokedCommsWarrant = revokedWarrants.find(
    (warrant) => warrant.id === commsWarrant.id,
  );

  if (!revokedCommsWarrant) {
    throw new Error("Expected revoked comms warrant in main scenario.");
  }

  const commsPostRevokeAttempt = executeGmailSendAction({
    actionId: "action-comms-send-post-revoke-001",
    requestedAt: "2026-04-17T09:14:00.000Z",
    warrant: revokedCommsWarrant,
    warrants: revokedWarrants,
    user: scenarioUser,
    recipients: ["partners@northstar.vc"],
    usage: {
      sendsUsed: 1,
    },
    adapter: adapters.gmailSend,
  });
  const agents: DemoAgent[] = [
    {
      ...plannerAgent,
      warrantId: rootWarrant.id,
    },
    {
      ...calendarAgent,
      warrantId: calendarWarrant.id,
    },
    {
      ...commsAgent,
      status: "revoked",
      warrantId: commsWarrant.id,
    },
  ];

  const scenario: DemoScenario = {
    id: SCENARIO_ID,
    title: "Investor update for April 18",
    taskPrompt:
      "Prepare my investor update for tomorrow and coordinate follow-ups.",
    referenceTime: REFERENCE_TIME,
    targetDate: TARGET_DATE,
    timezone: TIMEZONE,
    rootWarrantId: rootWarrant.id,
    user: scenarioUser,
    agents,
    warrants: revokedWarrants,
    actionAttempts: [
      calendarAction.attempt,
      commsAction.attempt,
      commsOverreach.attempt,
      commsSendAttempt,
      commsApprovedSend.attempt,
      commsPostRevokeAttempt.attempt,
    ],
    approvals: [commsSendApproved],
    revocations: [revocation],
    timeline: [
      createScenarioLoadedEvent(),
      createWarrantIssuedEvent({
        id: "event-root-warrant-issued-001",
        at: rootWarrant.createdAt,
        actorKind: "user",
        actorId: scenarioUser.id,
        warrant: rootWarrant,
        title: "Root planner warrant activated",
        description:
          "Maya approves the parent warrant for Planner Agent. It may prepare the investor update and delegate only narrower child warrants.",
      }),
      createWarrantIssuedEvent({
        id: "event-calendar-warrant-issued-001",
        at: "2026-04-17T09:02:00.000Z",
        actorKind: "agent",
        actorId: plannerAgent.id,
        warrant: calendarWarrant,
        title: "Calendar child warrant delegated",
        description:
          "Planner Agent delegates one narrower calendar warrant. Calendar Agent may read the April 18 window, but it cannot draft or send email.",
      }),
      createWarrantIssuedEvent({
        id: "event-comms-warrant-issued-001",
        at: "2026-04-17T09:03:00.000Z",
        actorKind: "agent",
        actorId: plannerAgent.id,
        warrant: commsWarrant,
        title: "Comms child warrant delegated",
        description:
          "Planner Agent delegates a narrower comms warrant. Comms Agent may draft immediately and request one send, but it cannot send without approval.",
      }),
      calendarAction.timelineEvent,
      commsAction.timelineEvent,
      commsOverreach.timelineEvent,
      createApprovalEvent({
        id: "event-comms-send-approval-requested-001",
        at: commsSendRequestedAt,
        kind: "approval.requested",
        actorKind: "agent",
        actorId: commsAgent.id,
        warrant: commsWarrant,
        actionId: commsSendAction.id,
        approvalId: commsSendApproval.id,
        title: "Comms send waiting for approval",
        description:
          "Comms Agent stayed inside its warrant, but the real Gmail send is paused until Maya approves this exact email through Auth0.",
      }),
      createApprovalEvent({
        id: "event-comms-send-approval-approved-001",
        at: commsSendApproved.decidedAt ?? "2026-04-17T09:11:00.000Z",
        kind: "approval.approved",
        actorKind: "user",
        actorId: scenarioUser.id,
        warrant: commsWarrant,
        actionId: commsSendAction.id,
        approvalId: commsSendApproved.id,
        title: "Approval granted for the exact send",
        description:
          "Maya approves the exact email preview through Auth0, releasing one bounded live Gmail send for the Comms branch.",
      }),
      commsApprovedSend.timelineEvent,
      createRevocationEvent({
        revocation,
        warrant: revokedCommsWarrant,
        title: "Comms branch revoked",
        description:
          "Maya revokes the Comms branch after the approved send, immediately removing authority from that warrant and any descendants.",
      }),
      commsPostRevokeAttempt.timelineEvent,
    ],
    examples: {
      calendarChildWarrantId: calendarWarrant.id,
      commsChildWarrantId: commsWarrant.id,
      calendarActionId: calendarAction.attempt.id,
      commsDraftActionId: commsAction.attempt.id,
      commsOverreachActionId: commsOverreach.attempt.id,
      commsSendActionId: commsSendAttempt.id,
      commsSendApprovalId: commsSendApproval.id,
    },
  };

  return {
    scenario,
    taskPlan,
  };
}
