import type { ModelAdapterRequest } from "@/contracts";
import type {
  PlannerRuntimeDeps,
  PlannerRuntimeEvent,
  PlannerRuntimeIdentity,
  PlannerRuntimeInput,
  PlannerRuntimeResult,
  PlannerStructuredPlan,
} from "@/agents/types";

const plannerRuntimeIdentity: PlannerRuntimeIdentity = {
  id: "agent-planner-001",
  role: "planner",
  label: "Planner Agent",
};

const plannerSchemaName = "planner.delegation-plan.v1";
const plannerSchemaDescription =
  "JSON object with goalInterpretation string and delegationDrafts[] containing childRole, objective, requestedCapabilities.";

function buildPlannerPrompt(input: PlannerRuntimeInput): string {
  return [
    "You are the Planner Agent for the Warrant demo.",
    "Interpret the goal and propose only narrow child delegation requests.",
    "Never request broad authority when a narrower capability is enough.",
    `Goal: ${input.goal}`,
    `Root request id: ${input.rootRequestId}`,
    `Parent warrant capabilities: ${input.parentWarrant.capabilities.join(", ")}`,
  ].join("\n");
}

function toPlannerStructuredPlan(rawOutput: unknown): PlannerStructuredPlan {
  if (!rawOutput || typeof rawOutput !== "object") {
    throw new Error("Planner model output must be an object.");
  }

  const candidate = rawOutput as Partial<PlannerStructuredPlan>;
  if (typeof candidate.goalInterpretation !== "string") {
    throw new Error("Planner model output missing goalInterpretation string.");
  }
  if (!Array.isArray(candidate.delegationDrafts)) {
    throw new Error("Planner model output missing delegationDrafts array.");
  }

  return candidate as PlannerStructuredPlan;
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
    schemaName: plannerSchemaName,
    schemaDescription: plannerSchemaDescription,
    instructions: buildPlannerPrompt(input),
    repairContext: null,
    attempt: 1,
  };

  const rawPlan = deps.modelAdapter.invokeStructured(request);
  const plan = toPlannerStructuredPlan(rawPlan);
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
    plan,
    events,
  };
}

