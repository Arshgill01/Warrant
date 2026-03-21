import type {
  DemoAgent,
  DemoScenario,
  DemoUser,
  LedgerEvent,
  WarrantContract,
} from "@/contracts";
import {
  createDeterministicScenarioActionAdapters,
  executeCalendarReadAction,
  executeGmailDraftAction,
  type ScenarioActionAdapters,
} from "@/actions";
import { issueChildWarrant, issueRootWarrant } from "@/warrants";
import type { MainScenarioRunResult, PlannerTaskRecord } from "@/agents/types";

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
    purpose: "Break the investor-update request into bounded child-agent tasks.",
    summary:
      "Owns the root warrant, decides the deterministic two-agent plan, and delegates only the minimum authority each child needs.",
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
      "Can perform one bounded calendar read inside the April 18 scheduling window.",
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
    purpose: "Draft investor follow-up emails without send authority.",
    summary:
      "Can prepare draft follow-ups for approved Northstar recipients but cannot send them in this slice.",
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

function requireIssuedWarrant(result: ReturnType<typeof issueChildWarrant>): WarrantContract {
  if (!result.ok) {
    throw new Error(result.reason.message);
  }

  return result.warrant;
}

export function runMainScenarioPlannerFlow(
  adapters: ScenarioActionAdapters = createDeterministicScenarioActionAdapters(),
): MainScenarioRunResult {
  const plannerAgent = buildPlannerAgent();
  const calendarAgent = buildCalendarAgent();
  const commsAgent = buildCommsAgent();

  const rootWarrant = issueRootWarrant({
    id: "warrant-planner-root-001",
    rootRequestId: ROOT_REQUEST_ID,
    createdBy: scenarioUser.id,
    agentId: plannerAgent.id,
    purpose:
      "Prepare the April 18 investor update and delegate only bounded scheduling and drafting authority.",
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
        purpose: "Read tomorrow's bounded calendar window before drafting follow-ups.",
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
          "Draft internal investor follow-up emails for approved recipients only.",
        capabilities: ["gmail.draft"],
        resourceConstraints: {
          allowedDomains: ["northstar.vc"],
          allowedRecipients: [
            "partners@northstar.vc",
            "finance@northstar.vc",
          ],
          maxDrafts: 2,
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
    warrants,
    actionAttempts: [calendarAction.attempt, commsAction.attempt],
    approvals: [],
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
          "Maya grants Planner Agent the parent warrant for the investor-update request, including delegation rights for narrower children.",
      }),
      createWarrantIssuedEvent({
        id: "event-calendar-warrant-issued-001",
        at: "2026-04-17T09:02:00.000Z",
        actorKind: "agent",
        actorId: plannerAgent.id,
        warrant: calendarWarrant,
        title: "Calendar child warrant issued",
        description:
          "Planner Agent narrows its authority to a single bounded calendar-read warrant for the April 18 schedule window.",
      }),
      createWarrantIssuedEvent({
        id: "event-comms-warrant-issued-001",
        at: "2026-04-17T09:03:00.000Z",
        actorKind: "agent",
        actorId: plannerAgent.id,
        warrant: commsWarrant,
        title: "Comms child warrant issued",
        description:
          "Planner Agent issues a drafting-only warrant so Comms Agent can prepare follow-ups without send authority.",
      }),
      calendarAction.timelineEvent,
      commsAction.timelineEvent,
    ],
    examples: {
      calendarChildWarrantId: calendarWarrant.id,
      commsChildWarrantId: commsWarrant.id,
      calendarActionId: calendarAction.attempt.id,
      commsDraftActionId: commsAction.attempt.id,
    },
  };

  return {
    scenario,
    taskPlan,
  };
}
