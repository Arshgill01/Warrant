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
    | "provider-response-invalid"
    | "output-not-json"
    | "output-schema-invalid";
  message: string;
  issues?: RuntimeModelStartupValidation["issues"];
  validationErrors?: string[];
  rawText?: string | null;
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

export interface StructuredOutputValidationSuccess<T> {
  ok: true;
  value: T;
}

export interface StructuredOutputValidationFailure {
  ok: false;
  errors: string[];
}

export type StructuredOutputValidationResult<T> =
  | StructuredOutputValidationSuccess<T>
  | StructuredOutputValidationFailure;

export interface StructuredOutputSchema<T> {
  name: string;
  description: string;
  validate: (value: unknown) => StructuredOutputValidationResult<T>;
}

export interface StructuredRuntimeModelInvocationInput<T>
  extends RuntimeModelInvocationInput {
  schema: StructuredOutputSchema<T>;
}

export interface StructuredRuntimeModelSuccess<T> {
  ok: true;
  value: T;
  rawText: string;
  attempts: 1 | 2;
  repaired: boolean;
  requestId: string | null;
  configuration: RuntimeModelConfiguration;
}

export interface StructuredRuntimeModelFailure {
  ok: false;
  failure: RuntimeModelFailure;
  attempts: 0 | 1 | 2;
  repaired: boolean;
  configuration: RuntimeModelConfiguration;
}

export type StructuredRuntimeModelResult<T> =
  | StructuredRuntimeModelSuccess<T>
  | StructuredRuntimeModelFailure;

const maxStructuredOutputAttempts = 2;

function tryParseJsonText(text: string): unknown | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Continue to fallback extractors.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]) as unknown;
    } catch {
      // Continue to fallback extractors.
    }
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    const objectSlice = trimmed.slice(objectStart, objectEnd + 1);
    try {
      return JSON.parse(objectSlice) as unknown;
    } catch {
      return null;
    }
  }

  return null;
}

function buildRepairPrompt(input: {
  task: string;
  originalPrompt: string;
  schema: StructuredOutputSchema<unknown>;
  lastOutputText: string;
  errors: string[];
  context?: string;
}): string {
  const sections = [
    `Task: ${input.task}`,
    `Original prompt:\n${input.originalPrompt}`,
    `Required output schema: ${input.schema.name}`,
    `Schema description:\n${input.schema.description}`,
    `Validation errors:\n- ${input.errors.join("\n- ")}`,
    `Last invalid output:\n${input.lastOutputText}`,
    "Return corrected JSON only. Do not include prose or markdown fences.",
  ];

  if (input.context) {
    sections.push(`Context:\n${input.context}`);
  }

  return sections.join("\n\n");
}

function validateStructuredOutput<T>(
  schema: StructuredOutputSchema<T>,
  rawText: string,
): StructuredOutputValidationResult<T> | { ok: false; errors: string[]; notJson: true } {
  const parsed = tryParseJsonText(rawText);

  if (parsed === null) {
    return {
      ok: false,
      notJson: true,
      errors: ["Model output was not valid JSON."],
    };
  }

  return schema.validate(parsed);
}

function isNotJsonValidationFailure(
  result: StructuredOutputValidationResult<unknown> | { ok: false; errors: string[]; notJson: true },
): result is { ok: false; errors: string[]; notJson: true } {
  return !result.ok && "notJson" in result && result.notJson === true;
}

function asUnknownSchema<T>(
  schema: StructuredOutputSchema<T>,
): StructuredOutputSchema<unknown> {
  return {
    ...schema,
    validate: (value: unknown) => schema.validate(value) as StructuredOutputValidationResult<unknown>,
  };
}

export async function invokeRuntimeModelStructuredOutput<T>(
  input: StructuredRuntimeModelInvocationInput<T>,
  transport: RuntimeModelTransport = callGoogleRuntimeModel,
): Promise<StructuredRuntimeModelResult<T>> {
  const startup = getRuntimeModelStartupValidation();

  if (!startup.ok) {
    return {
      ok: false,
      attempts: 0,
      repaired: false,
      configuration: startup.configuration,
      failure: {
        code: "runtime-config-invalid",
        message: "Runtime model configuration is invalid.",
        issues: startup.issues,
      },
    };
  }

  let attemptCount: 0 | 1 | 2 = 0;
  let repaired = false;
  let lastRawText: string | null = null;
  let lastValidationErrors: string[] = [];
  let requestId: string | null = null;
  let lastProviderError: string | null = null;
  const schemaForRepair = asUnknownSchema(input.schema);

  let currentPrompt = buildUserPrompt(input);

  while (attemptCount < maxStructuredOutputAttempts) {
    let response: RuntimeModelResponse;
    try {
      response = await transport({
        configuration: startup.configuration,
        systemPrompt: buildRoleAwareSystemPrompt(input.role),
        userPrompt: currentPrompt,
      });
      requestId = response.requestId;
    } catch (error) {
      attemptCount = (attemptCount + 1) as 1 | 2;
      lastProviderError = error instanceof Error
        ? error.message
        : "Unknown provider invocation failure.";
      return {
        ok: false,
        attempts: attemptCount,
        repaired,
        configuration: startup.configuration,
        failure: {
          code: "provider-request-failed",
          message: lastProviderError,
          rawText: lastRawText,
        },
      };
    }

    attemptCount = (attemptCount + 1) as 1 | 2;
    lastRawText = response.text;
    const validationResult = validateStructuredOutput(input.schema, response.text);

    if (validationResult.ok) {
      return {
        ok: true,
        value: validationResult.value,
        rawText: response.text,
        attempts: attemptCount,
        repaired,
        requestId,
        configuration: startup.configuration,
      };
    }

    lastValidationErrors = validationResult.errors;
    if (attemptCount >= maxStructuredOutputAttempts) {
      return {
        ok: false,
        attempts: attemptCount,
        repaired,
        configuration: startup.configuration,
        failure: {
          code: isNotJsonValidationFailure(validationResult)
            ? "output-not-json"
            : "output-schema-invalid",
          message:
            isNotJsonValidationFailure(validationResult)
              ? "Model output was not valid JSON after one repair retry."
              : "Model output failed schema validation after one repair retry.",
          validationErrors: validationResult.errors,
          rawText: response.text,
        },
      };
    }

    repaired = true;
    currentPrompt = buildRepairPrompt({
      task: input.task,
      originalPrompt: input.prompt,
      schema: schemaForRepair,
      lastOutputText: response.text,
      errors: validationResult.errors,
      context: input.context,
    });
  }

  return {
    ok: false,
    attempts: attemptCount,
    repaired,
    configuration: startup.configuration,
    failure: {
      code: "output-schema-invalid",
      message: "Model output could not be validated.",
      validationErrors: lastValidationErrors,
      rawText: lastRawText,
    },
  };
}
