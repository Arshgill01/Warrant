import { invokeWithValidationAndRepair } from "@/agents/runtime/invoke-with-validation";
import type { RuntimeModelAdapter } from "@/agents/runtime/model-adapter";
import type {
  CommsReasoningInput,
  CommsRuntimeOutput,
  RuntimeExecutionResult,
  RuntimeIdentity,
} from "@/agents/runtime/types";

export const commsRuntimeIdentity: RuntimeIdentity = {
  id: "runtime-comms-001",
  role: "comms",
  label: "Comms Runtime",
};

const COMMS_ALLOWED_CAPABILITIES = new Set(["gmail.draft", "gmail.send"]);

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

function isSubset(values: string[], allowed: string[]): boolean {
  const allowedSet = new Set(allowed);
  return values.every((value) => allowedSet.has(value));
}

function outputRespectsCommsRole(output: CommsRuntimeOutput, input: CommsReasoningInput): boolean {
  if (input.allowedCapabilities.some((capability) => !COMMS_ALLOWED_CAPABILITIES.has(capability))) {
    return false;
  }

  if (!input.allowedCapabilities.includes("gmail.draft")) {
    return false;
  }

  if (!isSubset(output.draft.to, input.context.recipients)) {
    return false;
  }

  if (output.sendProposal === null) {
    return true;
  }

  if (!input.allowedCapabilities.includes("gmail.send")) {
    return false;
  }

  return isSubset(output.sendProposal.recipients, input.context.recipients);
}

function validateCommsOutput(value: unknown, input: CommsReasoningInput): value is CommsRuntimeOutput {
  return isCommsRuntimeOutput(value) && outputRespectsCommsRole(value, input);
}

function buildCommsPrompt(input: CommsReasoningInput): string {
  return [
    "You are the Comms Agent runtime for Warrant.",
    "Your role is drafting communication content.",
    "Do not execute sends or claim sends happened.",
    "If suggesting a send, return proposal-only output with requiresApproval=true.",
    "Keep draft and send proposal as separate concepts.",
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
  return invokeWithValidationAndRepair({
    runtime: commsRuntimeIdentity,
    schemaName: "comms_runtime_output",
    prompt: buildCommsPrompt(input.runtimeInput),
    runtimeInput: input.runtimeInput,
    now: input.runtimeInput.now,
    modelAdapter: input.modelAdapter,
    repairHint:
      "Return strictly valid Comms runtime JSON. Always include a draft. Include sendProposal only when gmail.send is allowed.",
    invalidOutputMessage:
      "Comms runtime output was invalid after one repair retry and was returned as structured runtime failure.",
    validate: validateCommsOutput,
  });
}
