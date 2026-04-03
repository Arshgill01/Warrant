import type { ModelAdapterRequest } from "@/contracts";
import {
  PLANNER_SCHEMA_DESCRIPTION,
  PLANNER_SCHEMA_NAME,
  type PlannerSchemaIssue,
  validatePlannerStructuredPlan,
} from "@/agents/planner-schema";
import type {
  PlannerRuntimeDeps,
  PlannerRuntimeEvent,
  PlannerRuntimeIdentity,
  PlannerRuntimeInput,
  PlannerRuntimeResult,
} from "@/agents/types";

const plannerRuntimeIdentity: PlannerRuntimeIdentity = {
  id: "agent-planner-001",
  role: "planner",
  label: "Planner Agent",
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

export function runPlannerRuntime(
  input: PlannerRuntimeInput,
  deps: PlannerRuntimeDeps,
): PlannerRuntimeResult {
  const events: PlannerRuntimeEvent[] = [
    createEvent(input.now, "planner.started", "Planner runtime started.", 1),
  ];

  const request: ModelAdapterRequest = {
    actorRole: "planner",
    actorId: plannerRuntimeIdentity.id,
    objective: input.goal,
    schemaName: PLANNER_SCHEMA_NAME,
    schemaDescription: PLANNER_SCHEMA_DESCRIPTION,
    instructions: buildPlannerPrompt(input),
    repairContext: null,
    attempt: 1,
  };

  const rawPlan = deps.modelAdapter.invokeStructured(request);
  const validation = validatePlannerStructuredPlan(rawPlan);

  if (!validation.ok || !validation.plan) {
    throw new Error(
      `Planner output failed schema validation: ${formatSchemaIssues(validation.issues)}`,
    );
  }

  events.push(
    createEvent(
      input.now,
      "planner.plan.valid",
      "Planner produced a structured delegation plan.",
      2,
    ),
  );

  return {
    identity: plannerRuntimeIdentity,
    source: "model",
    plan: validation.plan,
    events,
  };
}
