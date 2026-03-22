import type {
  ActionAttempt,
  DemoActionAttempt,
  DemoUser,
  LedgerEvent,
  WarrantContract,
} from "@/contracts";
import type {
  CalendarReadAdapter,
  GmailDraftAdapter,
} from "@/actions/provider-adapters";
import { authorizeAction } from "@/warrants";

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

function createBlockedActionRecord(input: {
  action: ActionAttempt;
  warrant: WarrantContract;
  warrants: readonly WarrantContract[];
  requestedAt: string;
  fallbackSummary: string;
  fallbackResource: string;
  blockedTitle: string;
}): ExecutedScenarioAction {
  const authorization = authorizeAction({
    warrant: input.warrant,
    warrants: input.warrants,
    action: input.action,
    now: input.requestedAt,
  });

  return {
    attempt: {
      ...input.action,
      rootRequestId: input.warrant.rootRequestId,
      parentWarrantId: input.warrant.parentId,
      createdAt: input.requestedAt,
      summary: input.fallbackSummary,
      resource: input.fallbackResource,
      outcome: "blocked",
      outcomeReason: authorization.message,
      providerState: null,
      providerHeadline: null,
      providerDetail: null,
    },
    timelineEvent: {
      id: `${input.action.id}:timeline`,
      at: input.requestedAt,
      kind: "action.blocked",
      actorKind: "agent",
      actorId: input.warrant.agentId,
      warrantId: input.warrant.id,
      parentWarrantId: input.warrant.parentId,
      actionId: input.action.id,
      approvalId: null,
      revocationId: null,
      title: input.blockedTitle,
      description: authorization.message,
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
      warrants: input.warrants,
      requestedAt: input.requestedAt,
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
      warrants: input.warrants,
      requestedAt: input.requestedAt,
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
