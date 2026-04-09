import { invokeWithValidationAndRepair } from "@/agents/runtime/invoke-with-validation";
import type { RuntimeModelAdapter } from "@/agents/runtime/model-adapter";
import type {
  CalendarReasoningInput,
  CalendarRuntimeOutput,
  CalendarRuntimeProposal,
  RuntimeExecutionResult,
  RuntimeIdentity,
} from "@/agents/runtime/types";

export const calendarRuntimeIdentity: RuntimeIdentity = {
  id: "runtime-calendar-001",
  role: "calendar",
  label: "Calendar Runtime",
};
export const CALENDAR_RUNTIME_SCHEMA_NAME = "calendar_runtime_output";

const CALENDAR_ALLOWED_CAPABILITIES = new Set(["calendar.read", "calendar.schedule"]);

function isRiskLevel(value: unknown): value is "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high";
}

function isCalendarProposal(value: unknown): value is CalendarRuntimeProposal {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.kind === "calendar.read") {
    return (
      typeof candidate.startsAt === "string" &&
      typeof candidate.endsAt === "string" &&
      typeof candidate.rationale === "string"
    );
  }

  if (candidate.kind === "calendar.schedule") {
    return (
      typeof candidate.scheduledFor === "string" &&
      typeof candidate.rationale === "string"
    );
  }

  return false;
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
      !Array.isArray(summary.keyPoints) ||
      !summary.keyPoints.every((point) => typeof point === "string") ||
      !isRiskLevel(summary.riskLevel)
    ) {
      return false;
    }
  }

  return Array.isArray(candidate.proposals) && candidate.proposals.every(isCalendarProposal);
}

function outputRespectsCalendarRole(output: CalendarRuntimeOutput, input: CalendarReasoningInput): boolean {
  if (input.allowedCapabilities.some((capability) => !CALENDAR_ALLOWED_CAPABILITIES.has(capability))) {
    return false;
  }

  return output.proposals.every((proposal) => input.allowedCapabilities.includes(proposal.kind));
}

function validateCalendarOutput(value: unknown, input: CalendarReasoningInput): value is CalendarRuntimeOutput {
  return isCalendarRuntimeOutput(value) && outputRespectsCalendarRole(value, input);
}

export function validateCalendarRuntimeOutput(
  value: unknown,
  input: CalendarReasoningInput,
): value is CalendarRuntimeOutput {
  return validateCalendarOutput(value, input);
}

export function buildCalendarPrompt(input: CalendarReasoningInput): string {
  return [
    "You are the Calendar Agent runtime for Warrant.",
    "Only reason about scheduling context.",
    "Never propose email actions.",
    "If you propose actions, use only calendar.read or calendar.schedule.",
    "Do not execute provider actions. Proposals only.",
    `Objective: ${input.objective}`,
    `Window: ${input.window.startsAt} -> ${input.window.endsAt}`,
    `Timezone: ${input.timezone}`,
    `Allowed capabilities: ${input.allowedCapabilities.join(", ")}`,
    `Constraints: ${input.context.constraints.join(" | ")}`,
  ].join("\n");
}

export function runCalendarRuntime(input: {
  modelAdapter: RuntimeModelAdapter;
  runtimeInput: CalendarReasoningInput;
}): RuntimeExecutionResult<CalendarRuntimeOutput> {
  return invokeWithValidationAndRepair({
    runtime: calendarRuntimeIdentity,
    schemaName: CALENDAR_RUNTIME_SCHEMA_NAME,
    prompt: buildCalendarPrompt(input.runtimeInput),
    runtimeInput: input.runtimeInput,
    now: input.runtimeInput.now,
    modelAdapter: input.modelAdapter,
    repairHint:
      "Return strictly valid Calendar runtime JSON with only calendar proposals allowed by the provided capabilities.",
    invalidOutputMessage:
      "Calendar runtime output was invalid after one repair retry and was returned as structured runtime failure.",
    validate: validateCalendarOutput,
  });
}
