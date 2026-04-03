import type { RuntimeModelAdapter } from "@/agents/runtime/model-adapter";
import type {
  CalendarReasoningInput,
  CalendarRuntimeOutput,
  CalendarRuntimeProposal,
  RuntimeExecutionResult,
  RuntimeEvent,
  RuntimeIdentity,
} from "@/agents/runtime/types";

const calendarRuntimeIdentity: RuntimeIdentity = {
  id: "runtime-calendar-001",
  role: "calendar",
  label: "Calendar Runtime",
};

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

function buildCalendarPrompt(input: CalendarReasoningInput): string {
  return [
    "You are the Calendar Agent runtime for Warrant.",
    "Only reason about scheduling context.",
    "Never propose email actions.",
    "If you propose actions, use only calendar.read or calendar.schedule.",
    `Objective: ${input.objective}`,
    `Window: ${input.window.startsAt} -> ${input.window.endsAt}`,
    `Timezone: ${input.timezone}`,
    `Allowed capabilities: ${input.allowedCapabilities.join(", ")}`,
    `Constraints: ${input.context.constraints.join(" | ")}`,
  ].join("\n");
}

export async function runCalendarRuntime(input: {
  modelAdapter: RuntimeModelAdapter;
  runtimeInput: CalendarReasoningInput;
}): Promise<RuntimeExecutionResult<CalendarRuntimeOutput>> {
  const startedAt = input.runtimeInput.now;
  const events: RuntimeEvent[] = [
    {
      kind: "runtime.started" as const,
      runtimeId: calendarRuntimeIdentity.id,
      role: calendarRuntimeIdentity.role,
      at: startedAt,
      detail: "Calendar runtime invocation started.",
    },
  ];

  const response = await input.modelAdapter.invoke({
    runtime: calendarRuntimeIdentity,
    role: "calendar",
    schemaName: "calendar_runtime_output",
    prompt: buildCalendarPrompt(input.runtimeInput),
    input: input.runtimeInput,
    repairHint: null,
  });

  if (!isCalendarRuntimeOutput(response.rawOutput)) {
    events.push({
      kind: "runtime.output.invalid",
      runtimeId: calendarRuntimeIdentity.id,
      role: calendarRuntimeIdentity.role,
      at: startedAt,
      detail: "Calendar runtime returned output that failed schema validation.",
    });

    return {
      ok: false,
      runtime: calendarRuntimeIdentity,
      attempts: 1,
      failure: {
        code: "invalid_output",
        message:
          "Calendar runtime output did not match the structured output contract.",
        attempts: 1,
        lastRawOutput: response.rawOutput,
      },
      events,
    };
  }

  events.push({
    kind: "runtime.output.valid",
    runtimeId: calendarRuntimeIdentity.id,
    role: calendarRuntimeIdentity.role,
    at: startedAt,
    detail: "Calendar runtime returned a valid structured response.",
  });

  return {
    ok: true,
    runtime: calendarRuntimeIdentity,
    attempts: 1,
    output: response.rawOutput,
    degraded: false,
    events,
  };
}
