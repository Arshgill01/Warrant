import type {
  ActionAttempt,
  ActionAuthorizationSnapshot,
  DemoActionAttempt,
  DemoUser,
  LedgerEvent,
  WarrantContract,
} from "@/contracts";
import type {
  CalendarReadAdapter,
  GmailDraftAdapter,
  GmailSendAdapter,
} from "@/actions/provider-adapters";
import { authorizeAction, type AuthorizationResult } from "@/warrants";

export interface ExecutedScenarioAction {
  attempt: DemoActionAttempt;
  timelineEvent: LedgerEvent;
}

interface ExecuteActionBaseInput {
  actionId: string;
  requestedAt: string;
  warrant: WarrantContract;
  warrants: readonly WarrantContract[];
  target?: ActionAttempt["target"];
  usage?: ActionAttempt["usage"];
}

function createAuthorizationSnapshot(
  authorization: AuthorizationResult,
): ActionAuthorizationSnapshot {
  return {
    allowed: authorization.allowed,
    code: authorization.code,
    message: authorization.message,
    effectiveStatus: authorization.effectiveStatus,
    blockedByWarrantId: authorization.allowed
      ? null
      : authorization.blockedByWarrantId,
  };
}

function createBlockedActionRecord(input: {
  action: ActionAttempt;
  warrant: WarrantContract;
  authorization: AuthorizationResult;
  fallbackSummary: string;
  fallbackResource: string;
  blockedTitle: string;
  blockedDescription?: string;
}): ExecutedScenarioAction {
  if (input.authorization.allowed) {
    throw new Error(
      `Blocked action record ${input.action.id} requires a denied authorization result.`,
    );
  }

  return {
    attempt: {
      ...input.action,
      rootRequestId: input.authorization.lineage.rootRequestId,
      parentWarrantId: input.authorization.lineage.parentWarrantId,
      createdAt: input.action.requestedAt,
      summary: input.fallbackSummary,
      resource: input.fallbackResource,
      outcome: "blocked",
      outcomeReason: input.authorization.message,
      authorization: createAuthorizationSnapshot(input.authorization),
      providerState: null,
      providerHeadline: null,
      providerDetail: null,
    },
    timelineEvent: {
      id: `${input.action.id}:timeline`,
      at: input.action.requestedAt,
      kind: "action.blocked",
      actorKind: "agent",
      actorId: input.warrant.agentId,
      warrantId: input.warrant.id,
      parentWarrantId: input.warrant.parentId,
      actionId: input.action.id,
      approvalId: null,
      revocationId: null,
      title: input.blockedTitle,
      description: input.blockedDescription ?? input.authorization.message,
    },
  };
}

export function executeCalendarReadAction(input: ExecuteActionBaseInput & {
  adapter: CalendarReadAdapter;
  user: DemoUser;
  targetDate: string;
  timezone: string;
}): ExecutedScenarioAction {
  const action: ActionAttempt = {
    id: input.actionId,
    kind: "calendar.read",
    agentId: input.warrant.agentId,
    warrantId: input.warrant.id,
    requestedAt: input.requestedAt,
    target: input.target,
    usage: input.usage,
  };
  const authorization = authorizeAction({
    warrant: input.warrant,
    warrants: input.warrants,
    action,
    now: input.requestedAt,
  });

  if (!authorization.allowed) {
    return createBlockedActionRecord({
      action,
      warrant: input.warrant,
      authorization,
      fallbackSummary:
        "Calendar Agent was blocked before it could inspect tomorrow's availability.",
      fallbackResource: `Calendar window for ${input.targetDate}`,
      blockedTitle: "Calendar context blocked",
    });
  }

  const calendarWindow = input.warrant.resourceConstraints.calendarWindow;

  if (!calendarWindow) {
    throw new Error(
      `Calendar read action ${input.actionId} requires a calendar window constraint.`,
    );
  }

  const adapterResult = input.adapter.readAvailability({
    user: input.user,
    targetDate: input.targetDate,
    timezone: input.timezone,
    calendarWindow,
  });

  return {
    attempt: {
      ...action,
      rootRequestId: authorization.lineage.rootRequestId,
      parentWarrantId: authorization.lineage.parentWarrantId,
      createdAt: input.requestedAt,
      summary: adapterResult.summary,
      resource: adapterResult.resource,
      outcome: "allowed",
      outcomeReason: adapterResult.outcomeReason,
      authorization: createAuthorizationSnapshot(authorization),
      providerState: adapterResult.providerState,
      providerHeadline: adapterResult.providerHeadline,
      providerDetail: adapterResult.providerDetail,
    },
    timelineEvent: {
      id: `${input.actionId}:timeline`,
      at: input.requestedAt,
      kind: "action.allowed",
      actorKind: "agent",
      actorId: input.warrant.agentId,
      warrantId: input.warrant.id,
      parentWarrantId: input.warrant.parentId,
      actionId: input.actionId,
      approvalId: null,
      revocationId: null,
      title: adapterResult.timelineTitle,
      description: adapterResult.timelineDescription,
    },
  };
}

export function executeGmailDraftAction(input: ExecuteActionBaseInput & {
  adapter: GmailDraftAdapter;
  user: DemoUser;
  targetDate: string;
  recipients: string[];
}): ExecutedScenarioAction {
  const action: ActionAttempt = {
    id: input.actionId,
    kind: "gmail.draft",
    agentId: input.warrant.agentId,
    warrantId: input.warrant.id,
    requestedAt: input.requestedAt,
    target: {
      recipients: input.recipients,
    },
    usage: input.usage,
  };
  const authorization = authorizeAction({
    warrant: input.warrant,
    warrants: input.warrants,
    action,
    now: input.requestedAt,
  });

  if (!authorization.allowed) {
    return createBlockedActionRecord({
      action,
      warrant: input.warrant,
      authorization,
      fallbackSummary:
        "Comms Agent was blocked before it could draft the investor follow-ups.",
      fallbackResource: `Drafts for ${input.recipients.join(" and ")}`,
      blockedTitle: "Investor follow-up drafting blocked",
    });
  }

  const adapterResult = input.adapter.createFollowUpDrafts({
    user: input.user,
    targetDate: input.targetDate,
    recipients: input.recipients,
  });

  return {
    attempt: {
      ...action,
      rootRequestId: authorization.lineage.rootRequestId,
      parentWarrantId: authorization.lineage.parentWarrantId,
      createdAt: input.requestedAt,
      summary: adapterResult.summary,
      resource: adapterResult.resource,
      outcome: "allowed",
      outcomeReason: adapterResult.outcomeReason,
      authorization: createAuthorizationSnapshot(authorization),
      providerState: adapterResult.providerState,
      providerHeadline: adapterResult.providerHeadline,
      providerDetail: adapterResult.providerDetail,
    },
    timelineEvent: {
      id: `${input.actionId}:timeline`,
      at: input.requestedAt,
      kind: "action.allowed",
      actorKind: "agent",
      actorId: input.warrant.agentId,
      warrantId: input.warrant.id,
      parentWarrantId: input.warrant.parentId,
      actionId: input.actionId,
      approvalId: null,
      revocationId: null,
      title: adapterResult.timelineTitle,
      description: adapterResult.timelineDescription,
    },
  };
}

export function executeBlockedGmailSendAction(input: ExecuteActionBaseInput & {
  recipients: string[];
  fallbackSummary: string;
  fallbackResource: string;
  blockedTitle: string;
  blockedDescription: string;
}): ExecutedScenarioAction {
  const action: ActionAttempt = {
    id: input.actionId,
    kind: "gmail.send",
    agentId: input.warrant.agentId,
    warrantId: input.warrant.id,
    requestedAt: input.requestedAt,
    target: {
      recipients: input.recipients,
    },
    usage: input.usage,
  };
  const authorization = authorizeAction({
    warrant: input.warrant,
    warrants: input.warrants,
    action,
    now: input.requestedAt,
  });

  if (authorization.allowed) {
    throw new Error(
      `Blocked Gmail send action ${input.actionId} unexpectedly passed warrant authorization.`,
    );
  }

  return createBlockedActionRecord({
    action,
    warrant: input.warrant,
    authorization,
    fallbackSummary: input.fallbackSummary,
    fallbackResource: input.fallbackResource,
    blockedTitle: input.blockedTitle,
    blockedDescription: input.blockedDescription,
  });
}

export function executeGmailSendOverreachAction(input: ExecuteActionBaseInput & {
  recipients: string[];
}): ExecutedScenarioAction {
  return executeBlockedGmailSendAction({
    ...input,
    fallbackSummary:
      "Tried to send the investor follow-up to a recipient outside this branch.",
    fallbackResource: `Send email to ${input.recipients.join(" and ")}`,
    blockedTitle: "Comms send denied by warrant",
    blockedDescription:
      "Comms Agent tried to send the prepared follow-up to a recipient outside its approved recipient and domain bounds, so Warrant blocked the action before approval or Gmail execution.",
  });
}

function createGmailSendBlockedCopy(input: {
  authorization: AuthorizationResult;
}): {
  summary: string;
  title: string;
  description?: string;
} {
  if (
    !input.authorization.allowed &&
    (input.authorization.code === "warrant_revoked" ||
      input.authorization.code === "ancestor_revoked")
  ) {
    return {
      summary: "Comms Agent tried to send again after Maya revoked the branch.",
      title: "Post-revoke send blocked",
      description:
        "After Maya revokes the Comms branch, the same branch can no longer send even to previously approved recipients because its warrant has lost authority.",
    };
  }

  return {
    summary: "Comms Agent was blocked before it could send the investor follow-up.",
    title: "Investor follow-up send blocked",
  };
}

export function executeGmailSendAction(input: ExecuteActionBaseInput & {
  adapter: GmailSendAdapter;
  user: DemoUser;
  recipients: string[];
}): ExecutedScenarioAction {
  const action: ActionAttempt = {
    id: input.actionId,
    kind: "gmail.send",
    agentId: input.warrant.agentId,
    warrantId: input.warrant.id,
    requestedAt: input.requestedAt,
    target: {
      recipients: input.recipients,
    },
    usage: input.usage,
  };
  const authorization = authorizeAction({
    warrant: input.warrant,
    warrants: input.warrants,
    action,
    now: input.requestedAt,
  });

  if (!authorization.allowed) {
    const blockedCopy = createGmailSendBlockedCopy({ authorization });

    return createBlockedActionRecord({
      action,
      warrant: input.warrant,
      authorization,
      fallbackSummary: blockedCopy.summary,
      fallbackResource: `Send investor follow-up to ${input.recipients.join(" and ")}`,
      blockedTitle: blockedCopy.title,
      blockedDescription: blockedCopy.description,
    });
  }

  const adapterResult = input.adapter.sendApprovedFollowUp({
    user: input.user,
    recipients: input.recipients,
  });

  return {
    attempt: {
      ...action,
      rootRequestId: authorization.lineage.rootRequestId,
      parentWarrantId: authorization.lineage.parentWarrantId,
      createdAt: input.requestedAt,
      summary: adapterResult.summary,
      resource: adapterResult.resource,
      outcome: "allowed",
      outcomeReason: adapterResult.outcomeReason,
      authorization: createAuthorizationSnapshot(authorization),
      providerState: adapterResult.providerState,
      providerHeadline: adapterResult.providerHeadline,
      providerDetail: adapterResult.providerDetail,
    },
    timelineEvent: {
      id: `${input.actionId}:timeline`,
      at: input.requestedAt,
      kind: "action.allowed",
      actorKind: "agent",
      actorId: input.warrant.agentId,
      warrantId: input.warrant.id,
      parentWarrantId: input.warrant.parentId,
      actionId: input.actionId,
      approvalId: null,
      revocationId: null,
      title: adapterResult.timelineTitle,
      description: adapterResult.timelineDescription,
    },
  };
}
