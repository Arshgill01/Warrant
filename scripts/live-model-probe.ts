import { invokeRuntimeModelStructuredOutput } from "@/agents/runtime";
import type { StructuredOutputSchema } from "@/agents/runtime";
import { getRuntimeModelStartupValidation } from "@/agents/runtime/config";
import { buildPlannerPrompt } from "@/agents/planner-runtime";
import {
  PLANNER_SCHEMA_DESCRIPTION,
  PLANNER_SCHEMA_NAME,
  validatePlannerStructuredPlan,
} from "@/agents/planner-schema";
import { validatePlannerSemantics } from "@/agents/planner-semantics";
import type { PlannerStructuredPlan } from "@/agents/types";
import { issueRootWarrant } from "@/warrants";

interface CalendarRuntimeOutput {
  reasoning: string;
  scheduleSummary: {
    headline: string;
    keyPoints: string[];
    riskLevel: "low" | "medium" | "high";
  } | null;
  proposals: Array<
    | {
        kind: "calendar.read";
        startsAt: string;
        endsAt: string;
        rationale: string;
      }
    | {
        kind: "calendar.schedule";
        scheduledFor: string;
        rationale: string;
      }
  >;
}

interface CommsRuntimeOutput {
  reasoning: string;
  draft: {
    subject: string;
    bodyText: string;
    to: string[];
    cc: string[];
  };
  sendProposal:
    | {
        kind: "gmail.send";
        reason: string;
        recipients: string[];
        requiresApproval: true;
      }
    | null;
}

const GOAL = "Prepare my investor update for tomorrow and coordinate follow-ups.";
const ROOT_REQUEST_ID = "request-investor-update-live-probe";
const NOW = new Date().toISOString();
const APPROVED_RECIPIENTS = ["partners@northstar.vc", "finance@northstar.vc"];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCalendarRuntimeOutput(value: unknown): value is CalendarRuntimeOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.reasoning !== "string") {
    return false;
  }

  if (candidate.scheduleSummary !== null) {
    if (!candidate.scheduleSummary || typeof candidate.scheduleSummary !== "object") {
      return false;
    }

    const summary = candidate.scheduleSummary as Record<string, unknown>;
    if (
      typeof summary.headline !== "string" ||
      !isStringArray(summary.keyPoints) ||
      (summary.riskLevel !== "low" &&
        summary.riskLevel !== "medium" &&
        summary.riskLevel !== "high")
    ) {
      return false;
    }
  }

  if (!Array.isArray(candidate.proposals) || candidate.proposals.length === 0) {
    return false;
  }

  return candidate.proposals.every((proposal) => {
    if (!proposal || typeof proposal !== "object") {
      return false;
    }

    const typedProposal = proposal as Record<string, unknown>;
    if (typedProposal.kind === "calendar.read") {
      return (
        typeof typedProposal.startsAt === "string" &&
        typeof typedProposal.endsAt === "string" &&
        typeof typedProposal.rationale === "string"
      );
    }

    if (typedProposal.kind === "calendar.schedule") {
      return (
        typeof typedProposal.scheduledFor === "string" &&
        typeof typedProposal.rationale === "string"
      );
    }

    return false;
  });
}

function isCommsRuntimeOutput(value: unknown): value is CommsRuntimeOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.reasoning !== "string") {
    return false;
  }

  if (!candidate.draft || typeof candidate.draft !== "object") {
    return false;
  }

  const draft = candidate.draft as Record<string, unknown>;
  if (
    typeof draft.subject !== "string" ||
    typeof draft.bodyText !== "string" ||
    !isStringArray(draft.to) ||
    !isStringArray(draft.cc)
  ) {
    return false;
  }

  if (candidate.sendProposal === null) {
    return true;
  }

  if (!candidate.sendProposal || typeof candidate.sendProposal !== "object") {
    return false;
  }

  const proposal = candidate.sendProposal as Record<string, unknown>;
  return (
    proposal.kind === "gmail.send" &&
    typeof proposal.reason === "string" &&
    isStringArray(proposal.recipients) &&
    proposal.requiresApproval === true
  );
}

function isSubset(values: string[], allowed: string[]): boolean {
  const allowedSet = new Set(allowed);
  return values.every((value) => allowedSet.has(value));
}

const plannerSchema: StructuredOutputSchema<PlannerStructuredPlan> = {
  name: PLANNER_SCHEMA_NAME,
  description: PLANNER_SCHEMA_DESCRIPTION,
  validate(value: unknown) {
    const validation = validatePlannerStructuredPlan(value);

    if (!validation.ok || !validation.plan) {
      return {
        ok: false,
        errors: validation.issues.map((issue) => `${issue.path}: ${issue.message}`),
      };
    }

    return {
      ok: true,
      value: validation.plan,
    };
  },
};

const calendarSchema: StructuredOutputSchema<CalendarRuntimeOutput> = {
  name: "calendar_runtime_output",
  description:
    "JSON: { reasoning, scheduleSummary|null, proposals:[calendar.read|calendar.schedule] }",
  validate(value: unknown) {
    if (!isCalendarRuntimeOutput(value)) {
      return {
        ok: false,
        errors: ["Calendar runtime output shape is invalid."],
      };
    }

    return {
      ok: true,
      value,
    };
  },
};

const commsSchema: StructuredOutputSchema<CommsRuntimeOutput> = {
  name: "comms_runtime_output",
  description:
    "JSON: { reasoning, draft:{subject,bodyText,to,cc}, sendProposal|null }",
  validate(value: unknown) {
    if (!isCommsRuntimeOutput(value)) {
      return {
        ok: false,
        errors: ["Comms runtime output shape is invalid."],
      };
    }

    return {
      ok: true,
      value,
    };
  },
};

function printAndExitFailure(stage: string, details: Record<string, unknown>): never {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage,
        ...details,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

async function main() {
  const startup = getRuntimeModelStartupValidation();
  if (!startup.ok) {
    printAndExitFailure("runtime_startup", {
      configuration: {
        provider: startup.configuration.provider,
        logicalModel: startup.configuration.logicalModel,
        providerModelId: startup.configuration.providerModelId,
      },
      issues: startup.issues,
    });
  }

  const rootWarrant = issueRootWarrant({
    id: "warrant-planner-root-live-probe",
    rootRequestId: ROOT_REQUEST_ID,
    createdBy: "user-maya-chen",
    agentId: "agent-planner-001",
    purpose: "Live probe root warrant for investor-update delegation.",
    capabilities: ["calendar.read", "gmail.draft", "gmail.send", "warrant.issue"],
    resourceConstraints: {
      allowedDomains: ["northstar.vc"],
      allowedRecipients: APPROVED_RECIPIENTS,
      maxDrafts: 2,
      maxSends: 1,
    },
    canDelegate: true,
    maxChildren: 2,
    createdAt: NOW,
    expiresAt: "2026-04-18T18:00:00.000Z",
  });

  const plannerResult = await invokeRuntimeModelStructuredOutput(
    {
      role: "planner",
      task: "Generate a structured delegation plan for Warrant.",
      prompt: buildPlannerPrompt({
        rootRequestId: ROOT_REQUEST_ID,
        goal: GOAL,
        now: NOW,
        parentWarrant: rootWarrant,
      }),
      schema: plannerSchema,
    },
  );

  if (!plannerResult.ok) {
    printAndExitFailure("planner_runtime", {
      failure: plannerResult.failure,
      attempts: plannerResult.attempts,
      repaired: plannerResult.repaired,
    });
  }

  const semantics = validatePlannerSemantics(plannerResult.value, rootWarrant);
  if (!semantics.ok) {
    printAndExitFailure("planner_semantics", {
      issues: semantics.issues,
      plannerPlan: plannerResult.value,
    });
  }

  const calendarDraft = plannerResult.value.delegationDrafts.find(
    (draft) => draft.childRole === "calendar",
  );
  const commsDraft = plannerResult.value.delegationDrafts.find(
    (draft) => draft.childRole === "comms",
  );

  if (!calendarDraft || !commsDraft) {
    printAndExitFailure("planner_roles", {
      message: "Planner output must include both calendar and comms delegation drafts.",
      plannerPlan: plannerResult.value,
    });
  }

  const calendarResult = await invokeRuntimeModelStructuredOutput(
    {
      role: "calendar",
      task: "Produce bounded calendar reasoning output only.",
      prompt: [
        "You are Calendar Agent runtime for Warrant.",
        "Only propose calendar.read or calendar.schedule.",
        "Never propose email actions.",
        `Objective: ${calendarDraft.objective}`,
        `Allowed capabilities: ${calendarDraft.requestedCapabilities.join(", ")}`,
        "Window: 2026-04-18T08:00:00.000Z -> 2026-04-18T12:00:00.000Z",
      ].join("\n"),
      schema: calendarSchema,
    },
  );

  if (!calendarResult.ok) {
    printAndExitFailure("calendar_runtime", {
      failure: calendarResult.failure,
      attempts: calendarResult.attempts,
      repaired: calendarResult.repaired,
    });
  }

  const calendarProposalKinds = calendarResult.value.proposals.map(
    (proposal) => proposal.kind,
  );
  if (
    calendarProposalKinds.some(
      (kind) => !calendarDraft.requestedCapabilities.includes(kind),
    )
  ) {
    printAndExitFailure("calendar_capability_bounds", {
      allowedCapabilities: calendarDraft.requestedCapabilities,
      proposalKinds: calendarProposalKinds,
    });
  }

  const commsResult = await invokeRuntimeModelStructuredOutput(
    {
      role: "comms",
      task: "Produce bounded comms draft output and optional send proposal.",
      prompt: [
        "You are Comms Agent runtime for Warrant.",
        "Always provide a draft.",
        "Keep draft and send proposal separate.",
        "Never claim that send already happened.",
        `Objective: ${commsDraft.objective}`,
        `Allowed capabilities: ${commsDraft.requestedCapabilities.join(", ")}`,
        `Approved recipients: ${APPROVED_RECIPIENTS.join(", ")}`,
      ].join("\n"),
      schema: commsSchema,
    },
  );

  if (!commsResult.ok) {
    printAndExitFailure("comms_runtime", {
      failure: commsResult.failure,
      attempts: commsResult.attempts,
      repaired: commsResult.repaired,
    });
  }

  if (!isSubset(commsResult.value.draft.to, APPROVED_RECIPIENTS)) {
    printAndExitFailure("comms_draft_recipient_bounds", {
      approvedRecipients: APPROVED_RECIPIENTS,
      draftRecipients: commsResult.value.draft.to,
    });
  }

  if (
    commsResult.value.sendProposal &&
    !isSubset(commsResult.value.sendProposal.recipients, APPROVED_RECIPIENTS)
  ) {
    printAndExitFailure("comms_send_recipient_bounds", {
      approvedRecipients: APPROVED_RECIPIENTS,
      sendRecipients: commsResult.value.sendProposal.recipients,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedAt: NOW,
        runtimeConfiguration: {
          provider: startup.configuration.provider,
          logicalModel: startup.configuration.logicalModel,
          providerModelId: startup.configuration.providerModelId,
        },
        planner: {
          attempts: plannerResult.attempts,
          repaired: plannerResult.repaired,
          delegationDrafts: plannerResult.value.delegationDrafts.map((draft) => ({
            childRole: draft.childRole,
            requestedCapabilities: draft.requestedCapabilities,
          })),
        },
        calendar: {
          attempts: calendarResult.attempts,
          repaired: calendarResult.repaired,
          proposalKinds: calendarProposalKinds,
        },
        comms: {
          attempts: commsResult.attempts,
          repaired: commsResult.repaired,
          draftRecipients: commsResult.value.draft.to,
          hasSendProposal: commsResult.value.sendProposal !== null,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  printAndExitFailure("unexpected_error", {
    message: error instanceof Error ? error.message : String(error),
  });
});
