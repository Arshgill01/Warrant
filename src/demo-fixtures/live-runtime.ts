import {
  createTokenOnlyRuntimeScenarioActionAdapters,
  executeSendEmail,
  prepareGmailDraft,
  readCalendarAvailability,
  type ScenarioActionAdapters,
} from "@/actions";
import { runMainScenarioPlannerFlow } from "@/agents";
import { buildPlannerPrompt } from "@/agents/planner-runtime";
import {
  PLANNER_SCHEMA_DESCRIPTION,
  PLANNER_SCHEMA_NAME,
  validatePlannerStructuredPlan,
} from "@/agents/planner-schema";
import { validatePlannerSemantics } from "@/agents/planner-semantics";
import {
  CALENDAR_RUNTIME_SCHEMA_NAME,
  COMMS_RUNTIME_SCHEMA_NAME,
  buildCalendarPrompt,
  buildCommsPrompt,
  getRuntimeModelStartupValidation,
  invokeRuntimeModelStructuredOutput,
  validateCalendarRuntimeOutput,
  validateCommsRuntimeOutput,
} from "@/agents/runtime";
import type {
  CalendarReasoningInput,
  CalendarRuntimeOutput,
  CommsReasoningInput,
  CommsRuntimeOutput,
} from "@/agents/runtime";
import type {
  RuntimeModelAdapter,
  RuntimeModelInvocation,
  RuntimeModelResponse,
} from "@/agents/runtime/model-adapter";
import { getAuthSessionSnapshot } from "@/auth";
import { getGoogleConnectionSnapshotWithToken } from "@/connections";
import type {
  CalendarAvailabilityResult,
  DemoRuntimeExecutionSnapshot,
  DemoRuntimeMode,
  DemoScenario,
  GmailDraftResult,
  GmailSendResult,
  ProviderActionFailure,
  SharedModelAdapter,
  WarrantContract,
} from "@/contracts";
import type { MainScenarioStage } from "@/agents/types";
import type { PlannerStructuredPlan } from "@/agents/types";

interface ResolveLiveDemoScenarioInput {
  mode: DemoRuntimeMode;
  preset: "main" | "comms-revoked";
}

interface PrefetchedRuntimeArtifacts {
  plannerPlan: PlannerStructuredPlan;
  calendarInput: CalendarReasoningInput;
  commsInput: CommsReasoningInput;
  calendarOutput: CalendarRuntimeOutput;
  commsOutput: CommsRuntimeOutput;
  diagnostics: string[];
}

interface RuntimePrefetchFailure {
  reason: string;
  diagnostics: string[];
}

interface ProviderPrefetchSuccess {
  adapters: ScenarioActionAdapters;
  diagnostics: string[];
}

interface ProviderPrefetchFailure {
  reason: string;
  diagnostics: string[];
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function resolveStage(preset: ResolveLiveDemoScenarioInput["preset"]): MainScenarioStage {
  return preset === "main" ? "main" : "comms-revoked";
}

function createRuntimeExecutionSnapshot(input: {
  requestedMode: DemoRuntimeMode;
  lane: DemoRuntimeExecutionSnapshot["lane"];
  modelSource: DemoRuntimeExecutionSnapshot["modelSource"];
  providerSource: DemoRuntimeExecutionSnapshot["providerSource"];
  seededFallbackUsed: boolean;
  fallbackReason?: string | null;
  diagnostics?: string[];
}): DemoRuntimeExecutionSnapshot {
  return {
    requestedMode: input.requestedMode,
    lane: input.lane,
    modelSource: input.modelSource,
    providerSource: input.providerSource,
    seededFallbackUsed: input.seededFallbackUsed,
    fallbackReason: input.fallbackReason ?? null,
    diagnostics: input.diagnostics ?? [],
    checkedAt: nowIsoString(),
  };
}

function formatProviderFailure(failure: ProviderActionFailure | null): string {
  if (!failure) {
    return "unknown_provider_failure";
  }

  return `${failure.code}: ${failure.detail}`;
}

function findWarrantById(
  warrants: readonly WarrantContract[],
  warrantId: string,
): WarrantContract {
  const warrant = warrants.find((candidate) => candidate.id === warrantId);

  if (!warrant) {
    throw new Error(`Missing warrant ${warrantId} in scenario baseline.`);
  }

  return warrant;
}

function findDelegationDraft(
  plan: PlannerStructuredPlan,
  childRole: "calendar" | "comms",
): PlannerStructuredPlan["delegationDrafts"][number] {
  const draft = plan.delegationDrafts.find((entry) => entry.childRole === childRole);

  if (!draft) {
    throw new Error(`Live planner plan is missing the ${childRole} delegation draft.`);
  }

  return draft;
}

function ensureLivePlannerCoverage(
  plan: PlannerStructuredPlan,
  rootWarrant: WarrantContract,
): RuntimePrefetchFailure | null {
  const semanticValidation = validatePlannerSemantics(plan, rootWarrant);

  if (!semanticValidation.ok) {
    return {
      reason: "Live planner output failed semantic narrowing checks.",
      diagnostics: semanticValidation.issues,
    };
  }

  const calendarDraft = plan.delegationDrafts.find((draft) => draft.childRole === "calendar");
  const commsDraft = plan.delegationDrafts.find((draft) => draft.childRole === "comms");

  if (!calendarDraft || !calendarDraft.requestedCapabilities.includes("calendar.read")) {
    return {
      reason: "Live planner output omitted required calendar.read for the demo flow.",
      diagnostics: ["planner_required_capability=calendar.read"],
    };
  }

  if (!commsDraft || !commsDraft.requestedCapabilities.includes("gmail.send")) {
    return {
      reason: "Live planner output omitted required gmail.send for approval/revoke proof.",
      diagnostics: ["planner_required_capability=gmail.send"],
    };
  }

  return null;
}

function createPrefetchedPlannerModelAdapter(plan: PlannerStructuredPlan): SharedModelAdapter {
  return {
    name: "live-gemma-prefetched-planner",
    invokeStructured(): unknown {
      return plan;
    },
  };
}

function createPrefetchedChildRuntimeModelAdapter(input: {
  calendarOutput: CalendarRuntimeOutput;
  commsOutput: CommsRuntimeOutput;
}): RuntimeModelAdapter {
  return {
    invoke(request: RuntimeModelInvocation): RuntimeModelResponse {
      if (request.role === "calendar") {
        return {
          model: "live-gemma-prefetched-calendar",
          rawOutput: input.calendarOutput,
        };
      }

      return {
        model: "live-gemma-prefetched-comms",
        rawOutput: input.commsOutput,
      };
    },
  };
}

async function prefetchLiveRuntimeArtifacts(
  stage: MainScenarioStage,
): Promise<PrefetchedRuntimeArtifacts | RuntimePrefetchFailure> {
  const runtimeStartup = getRuntimeModelStartupValidation();

  if (!runtimeStartup.ok) {
    return {
      reason: "Runtime model startup validation failed for live Gemma lane.",
      diagnostics: runtimeStartup.issues.map((issue) => `${issue.field}: ${issue.message}`),
    };
  }

  const baseline = runMainScenarioPlannerFlow(undefined, { stage });
  const rootWarrant = findWarrantById(baseline.scenario.warrants, baseline.scenario.rootWarrantId);

  const plannerPrompt = [
    buildPlannerPrompt({
      rootRequestId: rootWarrant.rootRequestId,
      goal: baseline.scenario.taskPrompt,
      now: "2026-04-17T09:01:30.000Z",
      parentWarrant: rootWarrant,
    }),
    "Required demo constraints:",
    "- Include one calendar child with calendar.read.",
    "- Include one comms child with gmail.draft and gmail.send.",
    "- Keep all capabilities as narrow subsets of the parent warrant.",
    "- Return strictly valid JSON.",
  ].join("\n");

  const plannerResult = await invokeRuntimeModelStructuredOutput<PlannerStructuredPlan>({
    role: "planner",
    task: "Produce planner delegation for the investor-update demo scenario.",
    prompt: plannerPrompt,
    context: baseline.scenario.taskPrompt,
    schema: {
      name: PLANNER_SCHEMA_NAME,
      description: PLANNER_SCHEMA_DESCRIPTION,
      validate: (raw) => {
        const parsed = validatePlannerStructuredPlan(raw);

        if (!parsed.ok || !parsed.plan) {
          return {
            ok: false,
            errors: parsed.issues.map((issue) => `${issue.path}: ${issue.message}`),
          };
        }

        return {
          ok: true,
          value: parsed.plan,
        };
      },
    },
  });

  if (!plannerResult.ok) {
    return {
      reason: `Live planner invocation failed: ${plannerResult.failure.code}.`,
      diagnostics: [
        plannerResult.failure.message,
        ...(plannerResult.failure.validationErrors ?? []),
      ],
    };
  }

  const plannerCoverageIssue = ensureLivePlannerCoverage(plannerResult.value, rootWarrant);
  if (plannerCoverageIssue) {
    return plannerCoverageIssue;
  }

  const calendarDraft = findDelegationDraft(plannerResult.value, "calendar");
  const commsDraft = findDelegationDraft(plannerResult.value, "comms");
  const calendarWarrant = findWarrantById(
    baseline.scenario.warrants,
    baseline.scenario.examples.calendarChildWarrantId,
  );
  const commsWarrant = findWarrantById(
    baseline.scenario.warrants,
    baseline.scenario.examples.commsChildWarrantId,
  );

  const calendarWindow = calendarWarrant.resourceConstraints.calendarWindow;

  if (!calendarWindow) {
    return {
      reason: "Calendar child warrant is missing the required calendar window.",
      diagnostics: ["calendar_window=missing"],
    };
  }

  const calendarInput: CalendarReasoningInput = {
    requestId: rootWarrant.rootRequestId,
    warrantId: calendarWarrant.id,
    objective: calendarDraft.objective,
    timezone: baseline.scenario.timezone,
    now: "2026-04-17T09:04:00.000Z",
    window: {
      startsAt: calendarWindow.startsAt,
      endsAt: calendarWindow.endsAt,
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
    allowedCapabilities: calendarDraft.requestedCapabilities,
  };

  const calendarResult = await invokeRuntimeModelStructuredOutput<CalendarRuntimeOutput>({
    role: "calendar",
    task: "Produce bounded calendar runtime output for the scenario.",
    prompt: buildCalendarPrompt(calendarInput),
    context: baseline.scenario.taskPrompt,
    schema: {
      name: CALENDAR_RUNTIME_SCHEMA_NAME,
      description:
        "Return JSON with reasoning, scheduleSummary, and proposals allowed by provided capabilities.",
      validate: (raw) => {
        if (validateCalendarRuntimeOutput(raw, calendarInput)) {
          return {
            ok: true,
            value: raw,
          };
        }

        return {
          ok: false,
          errors: ["Calendar runtime output failed role/capability validation."],
        };
      },
    },
  });

  if (!calendarResult.ok) {
    return {
      reason: `Live calendar runtime invocation failed: ${calendarResult.failure.code}.`,
      diagnostics: [
        calendarResult.failure.message,
        ...(calendarResult.failure.validationErrors ?? []),
      ],
    };
  }

  const commsInput: CommsReasoningInput = {
    requestId: rootWarrant.rootRequestId,
    warrantId: commsWarrant.id,
    objective: commsDraft.objective,
    now: "2026-04-17T09:06:00.000Z",
    context: {
      recipients: ["partners@northstar.vc", "finance@northstar.vc"],
      sender: baseline.scenario.user.email,
      constraints: [
        "Draft before send.",
        "Keep recipients inside warrant bounds.",
        "Any send still requires human approval.",
      ],
      priorThreadSummary:
        "Recipients requested KPI and milestone highlights before tomorrow's investor update.",
    },
    allowedCapabilities: commsDraft.requestedCapabilities,
  };

  const commsResult = await invokeRuntimeModelStructuredOutput<CommsRuntimeOutput>({
    role: "comms",
    task: "Produce comms runtime output with draft and optional approval-gated send proposal.",
    prompt: buildCommsPrompt(commsInput),
    context: baseline.scenario.taskPrompt,
    schema: {
      name: COMMS_RUNTIME_SCHEMA_NAME,
      description:
        "Return JSON with reasoning, draft, and optional sendProposal that requires approval.",
      validate: (raw) => {
        if (validateCommsRuntimeOutput(raw, commsInput)) {
          return {
            ok: true,
            value: raw,
          };
        }

        return {
          ok: false,
          errors: ["Comms runtime output failed role/capability validation."],
        };
      },
    },
  });

  if (!commsResult.ok) {
    return {
      reason: `Live comms runtime invocation failed: ${commsResult.failure.code}.`,
      diagnostics: [
        commsResult.failure.message,
        ...(commsResult.failure.validationErrors ?? []),
      ],
    };
  }

  return {
    plannerPlan: plannerResult.value,
    calendarInput,
    commsInput,
    calendarOutput: calendarResult.value,
    commsOutput: commsResult.value,
    diagnostics: [
      `planner_model_id=${plannerResult.configuration.providerModelId}`,
      `planner_attempts=${plannerResult.attempts}`,
      `planner_repaired=${String(plannerResult.repaired)}`,
      `calendar_model_id=${calendarResult.configuration.providerModelId}`,
      `calendar_attempts=${calendarResult.attempts}`,
      `calendar_repaired=${String(calendarResult.repaired)}`,
      `comms_model_id=${commsResult.configuration.providerModelId}`,
      `comms_attempts=${commsResult.attempts}`,
      `comms_repaired=${String(commsResult.repaired)}`,
    ],
  };
}

function createProviderBackedAdapters(input: {
  calendar: CalendarAvailabilityResult;
  gmailDraft: GmailDraftResult;
  gmailSend: GmailSendResult | null;
}): ScenarioActionAdapters {
  return {
    calendar: {
      readAvailability() {
        const payload = input.calendar.data;

        return {
          providerState: "success",
          providerHeadline: input.calendar.headline,
          providerDetail: input.calendar.detail,
          summary: "Reviewed live Google Calendar availability for the bounded window.",
          resource: payload
            ? `${payload.calendarLabel} (${payload.startsAt} to ${payload.endsAt})`
            : "Google Calendar delegated window",
          outcomeReason:
            "Calendar execution used delegated Google access from Auth0 Token Vault.",
          timelineTitle: "Calendar window reviewed (provider-backed)",
          timelineDescription:
            "Calendar Agent executed a real delegated Google Calendar read through Auth0-backed access.",
          busySlots: payload?.busySlots.map((slot) => `${slot.startsAt}/${slot.endsAt}`) ?? [],
          recommendedFollowUpTime:
            payload?.events[0]?.endsAt ?? payload?.startsAt ?? "2026-04-18T10:30:00.000Z",
        };
      },
    },
    comms: {
      createFollowUpDrafts() {
        const payload = input.gmailDraft.data;

        return {
          providerState: "success",
          providerHeadline: input.gmailDraft.headline,
          providerDetail: input.gmailDraft.detail,
          summary: "Prepared live Gmail drafts for the bounded recipients.",
          resource: `Live drafts for ${payload?.to.join(" and ") ?? "approved recipients"}`,
          outcomeReason:
            "Comms draft execution used delegated Gmail draft access from Auth0 Token Vault.",
          timelineTitle: "Follow-up drafts prepared (provider-backed)",
          timelineDescription:
            "Comms Agent created real delegated Gmail drafts while send stayed approval-gated.",
          draftIds: payload?.draftId ? [payload.draftId] : ["live-draft-created"],
          preview: payload?.previewText ?? "Live delegated Gmail draft created.",
        };
      },
    },
    gmailSend: {
      sendApprovedFollowUp(inputForSend) {
        const payload = input.gmailSend?.data;

        return {
          providerState: "success",
          providerHeadline: input.gmailSend?.headline ?? "Email sent through delegated Google access.",
          providerDetail:
            input.gmailSend?.detail ??
            "Comms Agent executed a delegated Gmail send through Auth0 Token Vault.",
          summary: "Sent approved investor follow-up through delegated Gmail execution.",
          resource: `Live send to ${inputForSend.recipients.join(" and ")}`,
          outcomeReason:
            "The send executed through delegated Gmail access only after approval was granted.",
          timelineTitle: "Approved investor follow-up sent (provider-backed)",
          timelineDescription:
            "Comms Agent executed the approved Gmail send through Auth0-backed delegated provider access.",
          messageId: payload?.messageId ?? "live-send-message-id",
        };
      },
    },
  };
}

async function prefetchProviderAdapters(input: {
  stage: MainScenarioStage;
  runtimeArtifacts: PrefetchedRuntimeArtifacts;
}): Promise<ProviderPrefetchSuccess | ProviderPrefetchFailure> {
  const session = await getAuthSessionSnapshot();

  if (session.state !== "signed-in") {
    return {
      reason: "Live-provider mode requires a signed-in Auth0 session.",
      diagnostics: [`auth_session_state=${session.state}`],
    };
  }

  const connection = await getGoogleConnectionSnapshotWithToken(session);

  if (connection.snapshot.state !== "connected") {
    return {
      reason: "Live-provider mode requires a connected delegated Google path.",
      diagnostics: [
        `google_connection_state=${connection.snapshot.state}`,
        `google_lifecycle_state=${connection.snapshot.lifecycleState}`,
      ],
    };
  }

  if (!connection.delegatedAccessToken) {
    return {
      reason: "Live-provider mode could not acquire a delegated Google access token.",
      diagnostics: ["delegated_google_access_token=missing"],
    };
  }

  const calendarReadProposal = input.runtimeArtifacts.calendarOutput.proposals.find(
    (proposal) => proposal.kind === "calendar.read",
  );

  if (!calendarReadProposal || calendarReadProposal.kind !== "calendar.read") {
    return {
      reason: "Live calendar runtime did not produce the required calendar.read proposal.",
      diagnostics: ["calendar_read_proposal=missing"],
    };
  }

  const calendarResult = await readCalendarAvailability(
    {
      calendarId: "primary",
      startsAt: calendarReadProposal.startsAt,
      endsAt: calendarReadProposal.endsAt,
      timeZone: input.runtimeArtifacts.calendarInput.timezone,
      maxResults: 12,
    },
    {
      session,
      connection: connection.snapshot,
      accessToken: connection.delegatedAccessToken,
    },
  );

  if (calendarResult.state !== "success") {
    return {
      reason: "Calendar provider action failed in live-provider mode.",
      diagnostics: [formatProviderFailure(calendarResult.failure)],
    };
  }

  const draftRequest = {
    to: input.runtimeArtifacts.commsOutput.draft.to,
    cc: input.runtimeArtifacts.commsOutput.draft.cc,
    subject: input.runtimeArtifacts.commsOutput.draft.subject,
    bodyText: input.runtimeArtifacts.commsOutput.draft.bodyText,
    threadId: null,
  };

  const gmailDraftResult = await prepareGmailDraft(draftRequest, {
    session,
    connection: connection.snapshot,
    accessToken: connection.delegatedAccessToken,
  });

  if (gmailDraftResult.state !== "success") {
    return {
      reason: "Gmail draft provider action failed in live-provider mode.",
      diagnostics: [formatProviderFailure(gmailDraftResult.failure)],
    };
  }

  let gmailSendResult: GmailSendResult | null = null;

  if (input.stage === "comms-revoked") {
    const sendRecipients = input.runtimeArtifacts.commsOutput.sendProposal?.recipients ?? draftRequest.to;

    gmailSendResult = await executeSendEmail(
      {
        to: sendRecipients,
        cc: draftRequest.cc,
        subject: draftRequest.subject,
        bodyText: draftRequest.bodyText,
        threadId: null,
        draftId: gmailDraftResult.data?.draftId ?? null,
      },
      {
        session,
        connection: connection.snapshot,
        accessToken: connection.delegatedAccessToken,
        release: {
          execute: true,
          releasedBy: "demo",
          reason: "Live-provider lane send execution for comms-revoked replay.",
        },
      },
    );

    if (gmailSendResult.state !== "success") {
      return {
        reason: "Gmail send provider action failed in live-provider mode.",
        diagnostics: [formatProviderFailure(gmailSendResult.failure)],
      };
    }
  }

  return {
    adapters: createProviderBackedAdapters({
      calendar: calendarResult,
      gmailDraft: gmailDraftResult,
      gmailSend: gmailSendResult,
    }),
    diagnostics: [
      `google_connection_state=${connection.snapshot.state}`,
      `calendar_provider_state=${calendarResult.state}`,
      `gmail_draft_provider_state=${gmailDraftResult.state}`,
      `gmail_send_provider_state=${gmailSendResult?.state ?? "skipped"}`,
    ],
  };
}

function buildSeededFallbackScenario(input: {
  stage: MainScenarioStage;
  requestedMode: DemoRuntimeMode;
  reason: string;
  diagnostics: string[];
}): DemoScenario {
  return runMainScenarioPlannerFlow(undefined, {
    stage: input.stage,
    runtimeExecution: createRuntimeExecutionSnapshot({
      requestedMode: input.requestedMode,
      lane: "seeded-fallback",
      modelSource: "seeded-deterministic",
      providerSource: "seeded-simulated",
      seededFallbackUsed: true,
      fallbackReason: input.reason,
      diagnostics: input.diagnostics,
    }),
  }).scenario;
}

function buildTokenOnlyLiveScenario(input: {
  stage: MainScenarioStage;
  requestedMode: DemoRuntimeMode;
  runtimeArtifacts: PrefetchedRuntimeArtifacts;
  fallbackReason?: string | null;
  diagnostics?: string[];
}): DemoScenario {
  return runMainScenarioPlannerFlow(createTokenOnlyRuntimeScenarioActionAdapters(), {
    stage: input.stage,
    plannerModelAdapter: createPrefetchedPlannerModelAdapter(input.runtimeArtifacts.plannerPlan),
    childRuntimeModelAdapter: createPrefetchedChildRuntimeModelAdapter({
      calendarOutput: input.runtimeArtifacts.calendarOutput,
      commsOutput: input.runtimeArtifacts.commsOutput,
    }),
    runtimeExecution: createRuntimeExecutionSnapshot({
      requestedMode: input.requestedMode,
      lane: "live-token-only",
      modelSource: "live-gemma",
      providerSource: "token-only-simulated",
      seededFallbackUsed: false,
      fallbackReason: input.fallbackReason ?? null,
      diagnostics: [
        ...input.runtimeArtifacts.diagnostics,
        ...(input.diagnostics ?? []),
      ],
    }),
  }).scenario;
}

function buildLiveProviderScenario(input: {
  stage: MainScenarioStage;
  requestedMode: DemoRuntimeMode;
  runtimeArtifacts: PrefetchedRuntimeArtifacts;
  providerAdapters: ProviderPrefetchSuccess;
}): DemoScenario {
  return runMainScenarioPlannerFlow(input.providerAdapters.adapters, {
    stage: input.stage,
    plannerModelAdapter: createPrefetchedPlannerModelAdapter(input.runtimeArtifacts.plannerPlan),
    childRuntimeModelAdapter: createPrefetchedChildRuntimeModelAdapter({
      calendarOutput: input.runtimeArtifacts.calendarOutput,
      commsOutput: input.runtimeArtifacts.commsOutput,
    }),
    runtimeExecution: createRuntimeExecutionSnapshot({
      requestedMode: input.requestedMode,
      lane: "live-provider",
      modelSource: "live-gemma",
      providerSource: "provider-backed",
      seededFallbackUsed: false,
      diagnostics: [
        ...input.runtimeArtifacts.diagnostics,
        ...input.providerAdapters.diagnostics,
      ],
    }),
  }).scenario;
}

export function resolveDemoRuntimeMode(
  value: string | string[] | undefined,
): DemoRuntimeMode {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === "live" || candidate === "token-only" || candidate === "seeded") {
    return candidate;
  }

  return "token-only";
}

export async function resolveDemoScenarioForRuntime(
  input: ResolveLiveDemoScenarioInput,
): Promise<DemoScenario> {
  const stage = resolveStage(input.preset);

  if (input.mode === "seeded") {
    return buildSeededFallbackScenario({
      stage,
      requestedMode: input.mode,
      reason: "Seeded mode was explicitly selected.",
      diagnostics: ["runtime_mode=seeded"],
    });
  }

  const runtimeArtifacts = await prefetchLiveRuntimeArtifacts(stage);

  if ("reason" in runtimeArtifacts) {
    return buildSeededFallbackScenario({
      stage,
      requestedMode: input.mode,
      reason: runtimeArtifacts.reason,
      diagnostics: runtimeArtifacts.diagnostics,
    });
  }

  if (input.mode === "token-only") {
    return buildTokenOnlyLiveScenario({
      stage,
      requestedMode: input.mode,
      runtimeArtifacts,
      diagnostics: ["requested_mode=token-only"],
    });
  }

  const providerAdapters = await prefetchProviderAdapters({
    stage,
    runtimeArtifacts,
  });

  if ("reason" in providerAdapters) {
    return buildTokenOnlyLiveScenario({
      stage,
      requestedMode: input.mode,
      runtimeArtifacts,
      fallbackReason: providerAdapters.reason,
      diagnostics: providerAdapters.diagnostics,
    });
  }

  return buildLiveProviderScenario({
    stage,
    requestedMode: input.mode,
    runtimeArtifacts,
    providerAdapters,
  });
}
