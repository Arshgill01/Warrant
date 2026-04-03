import type { RuntimeModelAdapter } from "@/agents/runtime/model-adapter";
import type {
  CommsReasoningInput,
  CommsRuntimeOutput,
  RuntimeEvent,
  RuntimeExecutionResult,
  RuntimeIdentity,
} from "@/agents/runtime/types";

const commsRuntimeIdentity: RuntimeIdentity = {
  id: "runtime-comms-001",
  role: "comms",
  label: "Comms Runtime",
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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

function buildCommsPrompt(input: CommsReasoningInput): string {
  return [
    "You are the Comms Agent runtime for Warrant.",
    "Your main role is drafting communication content.",
    "Never execute sends or claim execution.",
    "If suggesting a send, produce proposal-only output with requiresApproval=true.",
    `Objective: ${input.objective}`,
    `Recipients: ${input.context.recipients.join(", ")}`,
    `Sender: ${input.context.sender}`,
    `Allowed capabilities: ${input.allowedCapabilities.join(", ")}`,
    `Constraints: ${input.context.constraints.join(" | ")}`,
    `Prior thread summary: ${input.context.priorThreadSummary ?? "none"}`,
  ].join("\n");
}

export async function runCommsRuntime(input: {
  modelAdapter: RuntimeModelAdapter;
  runtimeInput: CommsReasoningInput;
}): Promise<RuntimeExecutionResult<CommsRuntimeOutput>> {
  const startedAt = input.runtimeInput.now;
  const events: RuntimeEvent[] = [
    {
      kind: "runtime.started",
      runtimeId: commsRuntimeIdentity.id,
      role: commsRuntimeIdentity.role,
      at: startedAt,
      detail: "Comms runtime invocation started.",
    },
  ];

  const response = await input.modelAdapter.invoke({
    runtime: commsRuntimeIdentity,
    role: "comms",
    schemaName: "comms_runtime_output",
    prompt: buildCommsPrompt(input.runtimeInput),
    input: input.runtimeInput,
    repairHint: null,
  });

  if (!isCommsRuntimeOutput(response.rawOutput)) {
    events.push({
      kind: "runtime.output.invalid",
      runtimeId: commsRuntimeIdentity.id,
      role: commsRuntimeIdentity.role,
      at: startedAt,
      detail: "Comms runtime returned output that failed schema validation.",
    });

    return {
      ok: false,
      runtime: commsRuntimeIdentity,
      attempts: 1,
      failure: {
        code: "invalid_output",
        message: "Comms runtime output did not match the structured output contract.",
        attempts: 1,
        lastRawOutput: response.rawOutput,
      },
      events,
    };
  }

  events.push({
    kind: "runtime.output.valid",
    runtimeId: commsRuntimeIdentity.id,
    role: commsRuntimeIdentity.role,
    at: startedAt,
    detail: "Comms runtime returned a valid structured response.",
  });

  return {
    ok: true,
    runtime: commsRuntimeIdentity,
    attempts: 1,
    output: response.rawOutput,
    degraded: false,
    events,
  };
}
