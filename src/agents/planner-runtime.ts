import type { ModelAdapterRequest } from "@/contracts";
import {
  PLANNER_SCHEMA_DESCRIPTION,
  PLANNER_SCHEMA_NAME,
  type PlannerSchemaIssue,
  validatePlannerStructuredPlan,
} from "@/agents/planner-schema";
import { validatePlannerSemantics } from "@/agents/planner-semantics";
import type {
  PlannerDelegationDraft,
  PlannerRuntimeDeps,
  PlannerRuntimeEvent,
  PlannerRuntimeIdentity,
  PlannerRuntimeInput,
  PlannerRuntimeResult,
  PlannerStructuredPlan,
} from "@/agents/types";

const plannerRuntimeIdentity: PlannerRuntimeIdentity = {
  id: "runtime-planner-001",
  role: "planner",
  label: "Planner Runtime",
};

export function buildPlannerPrompt(input: PlannerRuntimeInput): string {
  return [
    "You are the Planner Agent for the Warrant demo.",
    "Interpret the goal and propose only narrow child delegation requests.",
    "Never request broad authority when a narrower capability is enough.",
    `Goal: ${input.goal}`,
    `Root request id: ${input.rootRequestId}`,
    `Parent warrant capabilities: ${input.parentWarrant.capabilities.join(", ")}`,
  ].join("\n");
}

function createEvent(
  at: string,
  kind: PlannerRuntimeEvent["kind"],
  detail: string,
  index: number,
): PlannerRuntimeEvent {
  return {
    id: `planner-event-${String(index).padStart(3, "0")}`,
    at,
    kind,
    detail,
  };
}

function formatSchemaIssues(issues: PlannerSchemaIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ");
}

function buildFallbackPlan(input: PlannerRuntimeInput): PlannerStructuredPlan {
  const drafts: PlannerDelegationDraft[] = [
    {
      childRole: "calendar",
      objective: "Check tomorrow's investor-update schedule context.",
      requestedCapabilities: ["calendar.read"],
    },
    {
      childRole: "comms",
      objective: "Draft investor follow-up messages for review.",
      requestedCapabilities: ["gmail.draft"],
    },
  ];

  return {
    goalInterpretation:
      `Safe fallback plan for goal: ${input.goal}`,
    delegationDrafts: drafts,
  };
}

interface PlannerAttemptResult {
  ok: boolean;
  plan: PlannerStructuredPlan | null;
  issues: string[];
  failedReason: string | null;
}

function invokePlannerAttempt(
  input: PlannerRuntimeInput,
  deps: PlannerRuntimeDeps,
  attempt: number,
  repairContext: string | null,
): PlannerAttemptResult {
  const request: ModelAdapterRequest = {
    actorRole: "planner",
    actorId: plannerRuntimeIdentity.id,
    objective: input.goal,
    schemaName: PLANNER_SCHEMA_NAME,
    schemaDescription: PLANNER_SCHEMA_DESCRIPTION,
    instructions: buildPlannerPrompt(input),
    repairContext,
    attempt,
  };

  let rawPlan: unknown;
  try {
    rawPlan = deps.modelAdapter.invokeStructured(request);
  } catch (error) {
    const failedReason = error instanceof Error ? error.message : "Unknown planner model failure.";
    return {
      ok: false,
      plan: null,
      issues: [],
      failedReason,
    };
  }

  const schemaValidation = validatePlannerStructuredPlan(rawPlan);
  if (!schemaValidation.ok || !schemaValidation.plan) {
    return {
      ok: false,
      plan: null,
      issues: [formatSchemaIssues(schemaValidation.issues)],
      failedReason: null,
    };
  }

  const semanticValidation = validatePlannerSemantics(schemaValidation.plan, input.parentWarrant);
  if (!semanticValidation.ok) {
    return {
      ok: false,
      plan: null,
      issues: semanticValidation.issues,
      failedReason: null,
    };
  }

  return {
    ok: true,
    plan: schemaValidation.plan,
    issues: [],
    failedReason: null,
  };
}

export function runPlannerRuntime(
  input: PlannerRuntimeInput,
  deps: PlannerRuntimeDeps,
): PlannerRuntimeResult {
  const events: PlannerRuntimeEvent[] = [
    createEvent(input.now, "planner.started", "Planner runtime started.", 1),
  ];

  let eventIndex = 2;
  let repairContext: string | null = null;
  let failureReason: string | null = null;

  for (const attempt of [1, 2]) {
    const result = invokePlannerAttempt(input, deps, attempt, repairContext);
    if (result.ok && result.plan) {
      events.push(
        createEvent(
          input.now,
          "planner.plan.valid",
          `Planner produced a valid structured plan on attempt ${attempt}.`,
          eventIndex,
        ),
      );
      return {
        identity: plannerRuntimeIdentity,
        source: "model",
        plan: result.plan,
        events,
        attemptCount: attempt,
        usedRepair: attempt === 2,
        failureReason,
      };
    }

    if (result.failedReason) {
      failureReason = result.failedReason;
      events.push(
        createEvent(
          input.now,
          "planner.failed",
          `Planner model invocation failed on attempt ${attempt}: ${result.failedReason}`,
          eventIndex,
        ),
      );
      eventIndex += 1;
    } else {
      const issues = result.issues.length > 0 ? result.issues.join(" | ") : "Unknown invalid output.";
      events.push(
        createEvent(
          input.now,
          "planner.output.invalid",
          `Planner output invalid on attempt ${attempt}: ${issues}`,
          eventIndex,
        ),
      );
      eventIndex += 1;
      repairContext = `Previous planner output was invalid. Fix these issues: ${issues}`;
    }
  }

  const fallbackPlan = buildFallbackPlan(input);
  events.push(
    createEvent(
      input.now,
      "planner.fallback.used",
      "Planner used deterministic fallback with bounded child capabilities (calendar.read + gmail.draft).",
      eventIndex,
    ),
  );

  return {
    identity: plannerRuntimeIdentity,
    source: "fallback",
    plan: fallbackPlan,
    events,
    attemptCount: 2,
    usedRepair: true,
    failureReason,
  };
}
