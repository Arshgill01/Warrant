import type { AgentRole } from "@/contracts";
import {
  type RuntimeModelConfiguration,
  type RuntimeModelStartupValidation,
  getRuntimeModelStartupValidation,
} from "@/agents/runtime/config";

export interface RuntimeModelInvocationInput {
  role: AgentRole;
  task: string;
  prompt: string;
  context?: string;
}

export interface RuntimeModelResponse {
  text: string;
  requestId: string | null;
  providerRaw: unknown;
}

export interface RuntimeModelProviderRequest {
  configuration: RuntimeModelConfiguration;
  systemPrompt: string;
  userPrompt: string;
}

export type RuntimeModelTransport = (
  request: RuntimeModelProviderRequest,
) => Promise<RuntimeModelResponse>;

export interface RuntimeModelFailure {
  code:
    | "runtime-config-invalid"
    | "provider-request-failed"
    | "provider-response-invalid";
  message: string;
  issues?: RuntimeModelStartupValidation["issues"];
}

export type RuntimeModelInvocationResult =
  | {
      ok: true;
      response: RuntimeModelResponse;
      configuration: RuntimeModelConfiguration;
    }
  | {
      ok: false;
      failure: RuntimeModelFailure;
      configuration: RuntimeModelConfiguration;
    };

const roleDirectives: Record<AgentRole, string> = {
  planner:
    "You are Planner Agent. Produce narrowly delegated, verifiable outputs that preserve lineage and warrant constraints.",
  calendar:
    "You are Calendar Agent. Focus only on bounded calendar reasoning and do not infer capabilities you were not granted.",
  comms:
    "You are Comms Agent. Focus on bounded communication tasks and never imply send authority beyond explicit approvals.",
  docs: "You are Docs Agent. Limit analysis to the allowed document scope and avoid broad data claims.",
};

const baseSystemPrompt = [
  "Warrant runtime guardrails:",
  "- Keep outputs concise and operationally precise.",
  "- Never invent authority, approval, or provider state.",
  "- Do not emit hidden chain-of-thought.",
  "- Return only information required for the requested task.",
].join("\n");

function buildRoleAwareSystemPrompt(role: AgentRole): string {
  return [baseSystemPrompt, roleDirectives[role]].join("\n\n");
}

function buildUserPrompt(input: RuntimeModelInvocationInput): string {
  const sections = [`Task: ${input.task}`, `Prompt:\n${input.prompt}`];

  if (input.context) {
    sections.push(`Context:\n${input.context}`);
  }

  return sections.join("\n\n");
}

function getFirstCandidateText(payload: unknown): { text: string; requestId: string | null } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as {
    responseId?: unknown;
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: unknown;
        }>;
      };
    }>;
  };

  const firstCandidate = record.candidates?.[0];
  const firstPart = firstCandidate?.content?.parts?.find(
    (part) => typeof part.text === "string" && part.text.trim().length > 0,
  );

  if (!firstPart || typeof firstPart.text !== "string") {
    return null;
  }

  return {
    text: firstPart.text,
    requestId: typeof record.responseId === "string" ? record.responseId : null,
  };
}

export async function callGoogleRuntimeModel(
  request: RuntimeModelProviderRequest,
): Promise<RuntimeModelResponse> {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${request.configuration.providerModelId}:generateContent`;

  const response = await fetch(`${endpoint}?key=${request.configuration.apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [{
        role: "user",
        parts: [{ text: request.userPrompt }],
      }],
      generationConfig: {
        temperature: request.configuration.defaults.temperature,
        topP: request.configuration.defaults.topP,
        maxOutputTokens: request.configuration.defaults.maxOutputTokens,
        responseMimeType: request.configuration.defaults.responseMimeType,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  const extracted = getFirstCandidateText(payload);

  if (!extracted) {
    throw new Error("Provider response did not include candidate text.");
  }

  return {
    text: extracted.text,
    requestId: extracted.requestId,
    providerRaw: payload,
  };
}

export async function invokeRuntimeModel(
  input: RuntimeModelInvocationInput,
  transport: RuntimeModelTransport = callGoogleRuntimeModel,
): Promise<RuntimeModelInvocationResult> {
  const startup = getRuntimeModelStartupValidation();

  if (!startup.ok) {
    return {
      ok: false,
      configuration: startup.configuration,
      failure: {
        code: "runtime-config-invalid",
        message: "Runtime model configuration is invalid.",
        issues: startup.issues,
      },
    };
  }

  try {
    const response = await transport({
      configuration: startup.configuration,
      systemPrompt: buildRoleAwareSystemPrompt(input.role),
      userPrompt: buildUserPrompt(input),
    });

    return {
      ok: true,
      response,
      configuration: startup.configuration,
    };
  } catch (error) {
    return {
      ok: false,
      configuration: startup.configuration,
      failure: {
        code: "provider-request-failed",
        message: error instanceof Error ? error.message : "Unknown provider invocation failure.",
      },
    };
  }
}

export function createRoleAwareSystemPrompt(role: AgentRole): string {
  return buildRoleAwareSystemPrompt(role);
}
