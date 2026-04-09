import type {
  ActionAttempt,
  DemoAgent,
  DemoRuntimeExecutionSnapshot,
  DemoScenario,
  DemoUser,
  LedgerEvent,
  RevocationRecord,
  RuntimeActionProposal as ActionProposal,
  RuntimeControlEvent as RuntimeEvent,
  RuntimeProposalControlDecision as ProposalControlDecision,
  SharedModelAdapter,
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
  issueChildWarrant,
  issueRootWarrant,
  revokeWarrantBranch,
} from "@/warrants";
import {
  createExecutedDecision,
  createRuntimeEventFromDecision,
  evaluateProposalControl,
} from "@/agents/runtime-control";
import type {
  MainScenarioRunResult,
  MainScenarioStage,
  PlannerDelegationDraft,
  PlannerTaskRecord,
} from "@/agents/types";
import { createDeterministicPlannerModelAdapter } from "@/agents/model-adapter";
import { runPlannerRuntime } from "@/agents/planner-runtime";
import {
  createDeterministicChildRuntimeModelAdapter,
  runCalendarRuntime,
  runCommsRuntime,
} from "@/agents/runtime";
import type { RuntimeModelAdapter } from "@/agents/runtime/model-adapter";
import type {
  CalendarRuntimeOutput,
  CommsRuntimeOutput,
  RuntimeExecutionResult,
} from "@/agents/runtime/types";

const SCENARIO_ID = "demo-scenario-investor-update";
const ROOT_REQUEST_ID = "request-investor-update-001";
const REFERENCE_TIME = "2026-04-17T09:00:00.000Z";
const TARGET_DATE = "2026-04-18";
const TIMEZONE = "America/Los_Angeles";
const MAIN_SCENARIO_PROMPT =
  "Prepare my investor update for tomorrow and coordinate follow-ups.";

const scenarioUser: DemoUser = {
  id: "user-maya-chen",
  label: "Maya Chen",
  email: "maya@northstar.vc",
  timezone: TIMEZONE,
};

function buildPlannerAgent(): Omit<DemoAgent, "warrantId"> {
  return {
    id: "agent-planner-001",
    runtimeActorId: "runtime-planner-001",
    runtimeActorLabel: "Planner Runtime",
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
    runtimeActorId: "runtime-calendar-001",
    runtimeActorLabel: "Calendar Runtime",
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
    runtimeActorId: "runtime-comms-001",
    runtimeActorLabel: "Comms Runtime",
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

function assertControlState(
  decision: ProposalControlDecision,
  expected: ProposalControlDecision["controlState"],
  actionId: string,
): void {
  if (decision.controlState !== expected) {
    throw new Error(
      `Expected control state ${expected} for ${actionId}, got ${decision.controlState}.`,
    );
  }
}

interface MainScenarioRunOptions {
  stage?: MainScenarioStage;
  plannerModelAdapter?: SharedModelAdapter;
  childRuntimeModelAdapter?: RuntimeModelAdapter;
  runtimeExecution?: DemoRuntimeExecutionSnapshot;
}

function createSeededRuntimeExecutionSnapshot(input: {
  requestedMode?: DemoRuntimeExecutionSnapshot["requestedMode"];
  diagnostics?: string[];
  fallbackReason?: string | null;
} = {}): DemoRuntimeExecutionSnapshot {
  return {
    requestedMode: input.requestedMode ?? "seeded",
    lane: "seeded-fallback",
    modelSource: "seeded-deterministic",
    providerSource: "seeded-simulated",
    seededFallbackUsed: true,
    fallbackReason: input.fallbackReason ?? "Running canonical deterministic seeded scenario.",
    diagnostics: input.diagnostics ?? [
      "planner_runtime=deterministic",
      "calendar_runtime=deterministic",
      "comms_runtime=deterministic",
      "provider_execution=seeded-simulated",
    ],
    checkedAt: REFERENCE_TIME,
  };
}

function requireDelegationDraft(
  drafts: PlannerDelegationDraft[],
  role: PlannerDelegationDraft["childRole"],
): PlannerDelegationDraft {
  const draft = drafts.find((entry) => entry.childRole === role);
  if (!draft) {
    throw new Error(`Planner runtime plan missing ${role} delegation draft.`);
  }

  return draft;
}

function requireRuntimeSuccess<Output>(
  result: RuntimeExecutionResult<Output>,
  runtimeLabel: string,
): Output {
  if (!result.ok) {
    throw new Error(
      `${runtimeLabel} failed before proposal/control bridging: ${result.failure.message}`,
    );
  }

  return result.output;
}

function requireCalendarReadProposal(output: CalendarRuntimeOutput): {
  startsAt: string;
  endsAt: string;
  rationale: string;
} {
  const proposal = output.proposals.find((candidate) => candidate.kind === "calendar.read");

  if (!proposal || proposal.kind !== "calendar.read") {
    throw new Error("Calendar runtime did not produce a required calendar.read proposal.");
  }

  return proposal;
}

function resolveCommsSendRecipients(output: CommsRuntimeOutput): string[] {
  return output.sendProposal?.recipients ?? output.draft.to;
}

export function runMainScenarioPlannerFlow(
  adapters: ScenarioActionAdapters = createDeterministicScenarioActionAdapters(),
  options: MainScenarioRunOptions = {},
): MainScenarioRunResult {
  const stage = options.stage ?? "comms-revoked";
  const runtimeExecution =
    options.runtimeExecution ?? createSeededRuntimeExecutionSnapshot();
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
  const plannerRuntime = runPlannerRuntime(
    {
      rootRequestId: ROOT_REQUEST_ID,
      goal: MAIN_SCENARIO_PROMPT,
      now: "2026-04-17T09:01:30.000Z",
      parentWarrant: rootWarrant,
    },
    {
      modelAdapter:
        options.plannerModelAdapter ?? createDeterministicPlannerModelAdapter(),
    },
  );
  const calendarDelegationDraft = requireDelegationDraft(
    plannerRuntime.plan.delegationDrafts,
    "calendar",
  );
  const commsDelegationDraft = requireDelegationDraft(
    plannerRuntime.plan.delegationDrafts,
    "comms",
  );

  const calendarWarrant = requireIssuedWarrant(
    issueChildWarrant({
      parent: rootWarrant,
      child: {
        id: "warrant-calendar-child-001",
        createdBy: plannerAgent.id,
        agentId: calendarAgent.id,
        purpose: "Read tomorrow's calendar window before follow-up drafting begins.",
        capabilities: calendarDelegationDraft.requestedCapabilities,
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
        capabilities: commsDelegationDraft.requestedCapabilities,
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

  if (!commsWarrant.capabilities.includes("gmail.send")) {
    throw new Error(
      "Main investor-update scenario requires Comms send capability for approval/revoke proof moments.",
    );
  }

  const warrants = [rootWarrant, calendarWarrant, commsWarrant];
  const childRuntimeModelAdapter =
    options.childRuntimeModelAdapter ?? createDeterministicChildRuntimeModelAdapter();
  const calendarRuntime = runCalendarRuntime({
    modelAdapter: childRuntimeModelAdapter,
    runtimeInput: {
      requestId: ROOT_REQUEST_ID,
      warrantId: calendarWarrant.id,
      objective: calendarDelegationDraft.objective,
      timezone: TIMEZONE,
      now: "2026-04-17T09:04:00.000Z",
      window: {
        startsAt: "2026-04-18T08:00:00.000Z",
        endsAt: "2026-04-18T12:00:00.000Z",
      },
      context: {
        knownCommitments: [
          {
            title: "Investor update prep",
            startsAt: "2026-04-18T09:00:00.000Z",
            endsAt: "2026-04-18T09:30:00.000Z",
          },
        ],
        constraints: [
          "Stay inside the delegated calendar window.",
          "Do not propose communication actions.",
        ],
      },
      allowedCapabilities: calendarWarrant.capabilities,
    },
  });
  const calendarRuntimeOutput = requireRuntimeSuccess(calendarRuntime, "Calendar runtime");
  const calendarReadProposal = requireCalendarReadProposal(calendarRuntimeOutput);
  const commsRuntime = runCommsRuntime({
    modelAdapter: childRuntimeModelAdapter,
    runtimeInput: {
      requestId: ROOT_REQUEST_ID,
      warrantId: commsWarrant.id,
      objective: commsDelegationDraft.objective,
      now: "2026-04-17T09:06:00.000Z",
      context: {
        recipients: ["partners@northstar.vc", "finance@northstar.vc"],
        sender: "maya@northstar.vc",
        constraints: [
          "Draft before send.",
          "Keep recipients inside warrant bounds.",
          "Any send still requires human approval.",
        ],
        priorThreadSummary:
          "Recipients requested KPI and milestone highlights before tomorrow's investor update.",
      },
      allowedCapabilities: commsWarrant.capabilities,
    },
  });
  const commsRuntimeOutput = requireRuntimeSuccess(commsRuntime, "Comms runtime");
  const commsDraftRecipients = commsRuntimeOutput.draft.to;
  const commsSendRecipients = resolveCommsSendRecipients(commsRuntimeOutput);
  const taskPlan: PlannerTaskRecord[] = [
    {
      id: "task-calendar-context-001",
      title: "Check tomorrow's schedule context",
      summary:
        "Planner delegates bounded schedule reasoning to Calendar Runtime and receives a read-only proposal for the April 18 window.",
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
        "Planner delegates bounded drafting to Comms Runtime and receives draft output plus an optional send proposal.",
      assignedAgentId: commsAgent.id,
      assignedRole: commsAgent.role,
      requiredCapabilities: ["gmail.draft"],
      warrantId: commsWarrant.id,
      status: "completed",
    },
  ];
  if (commsWarrant.capabilities.includes("gmail.send")) {
    taskPlan.push({
      id: "task-comms-send-approval-001",
      title: "Send approved investor follow-up emails",
      summary:
        "Comms Agent may execute one bounded Gmail send only after Maya approves the exact message through Auth0.",
      assignedAgentId: commsAgent.id,
      assignedRole: commsAgent.role,
      requiredCapabilities: ["gmail.send"],
      warrantId: commsWarrant.id,
      status: "delegated",
    });
  }

  const controlDecisions: ProposalControlDecision[] = [];
  const runtimeEvents: RuntimeEvent[] = [];
  const recordControlEvaluation = (
    evaluation: ReturnType<typeof evaluateProposalControl>,
  ): ProposalControlDecision => {
    controlDecisions.push(...evaluation.decisions);
    runtimeEvents.push(...evaluation.runtimeEvents);
    return evaluation.finalDecision;
  };

  const calendarProposal: ActionProposal = {
    id: "proposal-calendar-read-001",
    actionId: "action-calendar-read-001",
    requestedAt: "2026-04-17T09:05:00.000Z",
    kind: "calendar.read",
    agentId: calendarWarrant.agentId,
    runtimeActorId: calendarRuntime.runtime.id,
    warrantId: calendarWarrant.id,
    target: {
      scheduledFor: calendarReadProposal.startsAt,
    },
    summary: calendarReadProposal.rationale,
    resource: `Calendar window for ${TARGET_DATE}`,
  };
  const calendarDecision = recordControlEvaluation(
    evaluateProposalControl({
      proposal: calendarProposal,
      warrant: calendarWarrant,
      warrants,
      providerCheck: {
        available: true,
        state: "success",
        reason: "Calendar delegated execution path is available.",
      },
    }),
  );
  assertControlState(calendarDecision, "executable", calendarProposal.actionId);

  const calendarAction = executeCalendarReadAction({
    actionId: calendarProposal.actionId,
    requestedAt: calendarProposal.requestedAt,
    warrant: calendarWarrant,
    warrants,
    user: scenarioUser,
    targetDate: TARGET_DATE,
    timezone: TIMEZONE,
    target: calendarProposal.target,
    adapter: adapters.calendar,
  });
  const calendarExecutedDecision = createExecutedDecision({
    proposal: calendarProposal,
    warrant: calendarWarrant,
    reason: calendarAction.attempt.outcomeReason,
    authorization: calendarAction.attempt.authorization,
    providerState: calendarAction.attempt.providerState ?? null,
    metadata: {
      actionKind: calendarAction.attempt.kind,
      outcome: calendarAction.attempt.outcome,
    },
  });
  controlDecisions.push(calendarExecutedDecision);
  runtimeEvents.push(
    createRuntimeEventFromDecision(
      calendarExecutedDecision,
      "Action executed",
    ),
  );

  const commsDraftProposal: ActionProposal = {
    id: "proposal-comms-draft-001",
    actionId: "action-comms-draft-001",
    requestedAt: "2026-04-17T09:07:00.000Z",
    kind: "gmail.draft",
    agentId: commsWarrant.agentId,
    runtimeActorId: commsRuntime.runtime.id,
    warrantId: commsWarrant.id,
    target: {
      recipients: commsDraftRecipients,
    },
    usage: {
      draftsUsed: 0,
    },
    summary: commsRuntimeOutput.reasoning,
    resource: `Drafts for ${commsDraftRecipients.join(" and ")}`,
  };
  const commsDraftDecision = recordControlEvaluation(
    evaluateProposalControl({
      proposal: commsDraftProposal,
      warrant: commsWarrant,
      warrants,
      providerCheck: {
        available: true,
        state: "success",
        reason: "Gmail draft path is available for this branch.",
      },
    }),
  );
  assertControlState(commsDraftDecision, "executable", commsDraftProposal.actionId);

  const commsAction = executeGmailDraftAction({
    actionId: commsDraftProposal.actionId,
    requestedAt: commsDraftProposal.requestedAt,
    warrant: commsWarrant,
    warrants,
    user: scenarioUser,
    targetDate: TARGET_DATE,
    recipients: commsDraftRecipients,
    usage: {
      draftsUsed: 0,
    },
    adapter: adapters.comms,
  });
  const commsDraftExecutedDecision = createExecutedDecision({
    proposal: commsDraftProposal,
    warrant: commsWarrant,
    reason: commsAction.attempt.outcomeReason,
    authorization: commsAction.attempt.authorization,
    providerState: commsAction.attempt.providerState ?? null,
    metadata: {
      actionKind: commsAction.attempt.kind,
      outcome: commsAction.attempt.outcome,
    },
  });
  controlDecisions.push(commsDraftExecutedDecision);
  runtimeEvents.push(
    createRuntimeEventFromDecision(
      commsDraftExecutedDecision,
      "Action executed",
    ),
  );

  const commsOverreachProposal: ActionProposal = {
    id: "proposal-comms-send-overreach-001",
    actionId: "action-comms-send-overreach-001",
    requestedAt: "2026-04-17T09:08:00.000Z",
    kind: "gmail.send",
    agentId: commsWarrant.agentId,
    runtimeActorId: commsRuntime.runtime.id,
    warrantId: commsWarrant.id,
    target: {
      recipients: ["ceo@external-partner.com"],
    },
    usage: {
      sendsUsed: 0,
    },
    summary: "Attempt send to an out-of-bounds external recipient.",
    resource: "Send email to ceo@external-partner.com",
  };
  const commsOverreachDecision = recordControlEvaluation(
    evaluateProposalControl({
      proposal: commsOverreachProposal,
      warrant: commsWarrant,
      warrants,
    }),
  );
  assertControlState(
    commsOverreachDecision,
    "denied_policy",
    commsOverreachProposal.actionId,
  );

  const commsOverreach = executeGmailSendOverreachAction({
    actionId: commsOverreachProposal.actionId,
    requestedAt: commsOverreachProposal.requestedAt,
    warrant: commsWarrant,
    warrants,
    recipients: ["ceo@external-partner.com"],
    usage: {
      sendsUsed: 0,
    },
  });

  const commsSendRequestedAt = "2026-04-17T09:10:00.000Z";
  const commsSendProposal: ActionProposal = {
    id: "proposal-comms-send-001",
    actionId: "action-comms-send-001",
    requestedAt: commsSendRequestedAt,
    kind: "gmail.send",
    agentId: commsWarrant.agentId,
    runtimeActorId: commsRuntime.runtime.id,
    warrantId: commsWarrant.id,
    target: {
      recipients: commsSendRecipients,
    },
    usage: {
      sendsUsed: 0,
    },
    summary: commsRuntimeOutput.sendProposal?.reason ??
      "Request approval for one bounded investor follow-up send.",
    resource: `Send to ${commsSendRecipients.join(" and ")}`,
  };
  const commsSendPreApprovalDecision = recordControlEvaluation(
    evaluateProposalControl({
      proposal: commsSendProposal,
      warrant: commsWarrant,
      warrants,
      approval: {
        required: true,
        status: null,
      },
    }),
  );
  assertControlState(
    commsSendPreApprovalDecision,
    "approval_required",
    commsSendProposal.actionId,
  );

  const commsSendAction: ActionAttempt = {
    id: commsSendProposal.actionId,
    kind: commsSendProposal.kind,
    agentId: commsSendProposal.agentId,
    warrantId: commsSendProposal.warrantId,
    requestedAt: commsSendProposal.requestedAt,
    target: commsSendProposal.target,
    usage: commsSendProposal.usage,
  };

  const commsSendApproval = createSendApprovalRequest({
    id: "approval-comms-send-001",
    actionId: commsSendProposal.actionId,
    warrantId: commsWarrant.id,
    requestedByAgentId: commsAgent.id,
    title: "Approve investor follow-up send",
    reason:
      "This action would send a real email to other people. Maya must approve this exact message before Warrant can release the send.",
    subject: commsRuntimeOutput.draft.subject,
    bodyText: commsRuntimeOutput.draft.bodyText,
    to: commsSendRecipients,
    cc: commsRuntimeOutput.draft.cc,
    requestedAt: commsSendRequestedAt,
    expiresAt: "2026-04-17T18:00:00.000Z",
    draftId: "draft-investor-update-001",
    blastRadius:
      "If approved, the Comms branch may send this one email to partners@northstar.vc and finance@northstar.vc.",
  });

  const commsSendAttempt = {
    ...commsSendAction,
    rootRequestId: rootWarrant.rootRequestId,
    parentWarrantId: commsWarrant.parentId,
    createdAt: commsSendRequestedAt,
    authorization: {
      allowed: true,
      code: commsSendPreApprovalDecision.authorization?.code ?? "allowed",
      message:
        commsSendPreApprovalDecision.authorization?.message ??
        "This branch is within policy but requires explicit approval.",
      effectiveStatus:
        commsSendPreApprovalDecision.authorization?.effectiveStatus ?? "active",
      blockedByWarrantId: null,
    },
    summary:
      "Prepared the investor follow-up send and stopped for approval.",
    resource: `Send to ${commsSendRecipients.join(" and ")}`,
    outcome: "approval-required" as const,
    outcomeReason:
      "This branch is allowed to request one bounded send, but it still cannot send a real email until Maya approves this exact message.",
    approvalRequestId: commsSendApproval.id,
  };

  if (stage === "main") {
    const scenario: DemoScenario = {
      id: SCENARIO_ID,
      title: "Investor update for April 18",
      taskPrompt: MAIN_SCENARIO_PROMPT,
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
      controlDecisions,
      runtimeEvents,
      runtimeExecution,
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
      plannerRuntime,
    };
  }

  const commsSendApproved = decideApprovalRequest({
    request: commsSendApproval,
    status: "approved",
    decidedAt: "2026-04-17T09:11:00.000Z",
  });

  const commsApprovedSendProposal: ActionProposal = {
    id: "proposal-comms-send-approved-001",
    actionId: "action-comms-send-approved-001",
    requestedAt: "2026-04-17T09:12:00.000Z",
    kind: "gmail.send",
    agentId: commsWarrant.agentId,
    runtimeActorId: commsRuntime.runtime.id,
    warrantId: commsWarrant.id,
    target: {
      recipients: commsSendRecipients,
    },
    usage: {
      sendsUsed: 0,
    },
    summary: "Execute the approved bounded Gmail send.",
    resource: `Live send to ${commsSendRecipients.join(" and ")}`,
  };
  const commsApprovedSendDecision = recordControlEvaluation(
    evaluateProposalControl({
      proposal: commsApprovedSendProposal,
      warrant: commsWarrant,
      warrants,
      approval: {
        required: true,
        status: commsSendApproved.status,
      },
      providerCheck: {
        available: true,
        state: "success",
        reason: "Provider send execution path is available.",
      },
    }),
  );
  assertControlState(
    commsApprovedSendDecision,
    "executable",
    commsApprovedSendProposal.actionId,
  );

  const commsApprovedSend = executeGmailSendAction({
    actionId: commsApprovedSendProposal.actionId,
    requestedAt: commsApprovedSendProposal.requestedAt,
    warrant: commsWarrant,
    warrants,
    user: scenarioUser,
    recipients: commsSendRecipients,
    usage: {
      sendsUsed: 0,
    },
    approvalRequestId: commsSendApproved.id,
    adapter: adapters.gmailSend,
  });
  const commsSendExecutedDecision = createExecutedDecision({
    proposal: commsApprovedSendProposal,
    warrant: commsWarrant,
    reason: commsApprovedSend.attempt.outcomeReason,
    authorization: commsApprovedSend.attempt.authorization,
    approvalStatus: commsSendApproved.status,
    providerState: commsApprovedSend.attempt.providerState ?? null,
    metadata: {
      actionKind: commsApprovedSend.attempt.kind,
      outcome: commsApprovedSend.attempt.outcome,
    },
  });
  controlDecisions.push(commsSendExecutedDecision);
  runtimeEvents.push(
    createRuntimeEventFromDecision(
      commsSendExecutedDecision,
      "Action executed",
    ),
  );
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
    cascadedWarrantIds: commsRevocation.revokedWarrantIds.filter(
      (warrantId) => warrantId !== commsWarrant.id,
    ),
  });
  const revokedWarrants = commsRevocation.warrants;
  const revokedCommsWarrant = revokedWarrants.find(
    (warrant) => warrant.id === commsWarrant.id,
  );

  if (!revokedCommsWarrant) {
    throw new Error("Expected revoked comms warrant in main scenario.");
  }

  const commsPostRevokeProposal: ActionProposal = {
    id: "proposal-comms-send-post-revoke-001",
    actionId: "action-comms-send-post-revoke-001",
    requestedAt: "2026-04-17T09:14:00.000Z",
    kind: "gmail.send",
    agentId: revokedCommsWarrant.agentId,
    runtimeActorId: commsRuntime.runtime.id,
    warrantId: revokedCommsWarrant.id,
    target: {
      recipients: ["partners@northstar.vc"],
    },
    usage: {
      sendsUsed: 1,
    },
    summary: "Retry send after branch revocation.",
    resource: "Send investor follow-up to partners@northstar.vc",
  };
  const commsPostRevokeDecision = recordControlEvaluation(
    evaluateProposalControl({
      proposal: commsPostRevokeProposal,
      warrant: revokedCommsWarrant,
      warrants: revokedWarrants,
      approval: {
        required: true,
        status: commsSendApproved.status,
      },
    }),
  );
  assertControlState(
    commsPostRevokeDecision,
    "blocked_revoked",
    commsPostRevokeProposal.actionId,
  );

  const commsPostRevokeAttempt = executeGmailSendAction({
    actionId: commsPostRevokeProposal.actionId,
    requestedAt: commsPostRevokeProposal.requestedAt,
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
    taskPrompt: MAIN_SCENARIO_PROMPT,
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
    controlDecisions,
    runtimeEvents,
    runtimeExecution,
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
    plannerRuntime,
  };
}
