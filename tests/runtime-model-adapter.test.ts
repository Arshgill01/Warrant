import { describe, expect, it } from "vitest";
import {
  assertRuntimeModelStartup,
  invokeRuntimeModelStructuredOutput,
  readRuntimeModelConfiguration,
  type RuntimeModelResponse,
  type RuntimeModelTransport,
  type StructuredOutputSchema,
  validateRuntimeModelStartup,
} from "@/agents";

interface PlannerStructuredOutput {
  summary: string;
  nextActions: string[];
}

const plannerOutputSchema: StructuredOutputSchema<PlannerStructuredOutput> = {
  name: "planner-output-v1",
  description: "{ summary: string; nextActions: string[] }",
  validate(value: unknown) {
    if (!value || typeof value !== "object") {
      return {
        ok: false,
        errors: ["Output must be an object."],
      };
    }

    const record = value as {
      summary?: unknown;
      nextActions?: unknown;
    };

    if (typeof record.summary !== "string" || record.summary.trim().length === 0) {
      return {
        ok: false,
        errors: ["summary must be a non-empty string."],
      };
    }

    if (!Array.isArray(record.nextActions) || record.nextActions.some((item) => typeof item !== "string")) {
      return {
        ok: false,
        errors: ["nextActions must be a string array."],
      };
    }

    return {
      ok: true,
      value: {
        summary: record.summary,
        nextActions: record.nextActions,
      },
    };
  },
};

function createTransportWithResponses(responses: string[]): RuntimeModelTransport {
  let index = 0;

  return async (): Promise<RuntimeModelResponse> => {
    const text = responses[index] ?? responses[responses.length - 1] ?? "";
    index += 1;

    return {
      text,
      requestId: `req-${index}`,
      providerRaw: {
        candidateIndex: index,
      },
    };
  };
}

describe("runtime model startup validation", () => {
  it("maps logical gemma-4-31b to provider id gemma-4-31b-it by default", () => {
    const configuration = readRuntimeModelConfiguration({
      GOOGLE_API_KEY: "local-test-key",
    } as unknown as NodeJS.ProcessEnv);

    expect(configuration.logicalModel).toBe("gemma-4-31b");
    expect(configuration.providerModelId).toBe("gemma-4-31b-it");
  });

  it("fails startup validation when GOOGLE_API_KEY is missing", () => {
    const validation = validateRuntimeModelStartup({
      WARRANT_RUNTIME_MODEL_PROVIDER_ID: "gemma-4-31b",
    } as unknown as NodeJS.ProcessEnv);

    expect(validation.ok).toBe(false);
    expect(validation.configuration.logicalModel).toBe("gemma-4-31b");
    expect(validation.issues.map((issue) => issue.field)).toContain("GOOGLE_API_KEY");
  });

  it("throws from startup assertion when required config is missing", () => {
    expect(() =>
      assertRuntimeModelStartup({
        WARRANT_RUNTIME_MODEL_PROVIDER_ID: "gemma-4-31b",
      } as unknown as NodeJS.ProcessEnv)
    ).toThrowError(/Runtime model startup validation failed/);
  });

  it("fails startup validation when numeric overrides are malformed", () => {
    const validation = validateRuntimeModelStartup({
      GOOGLE_API_KEY: "local-test-key",
      WARRANT_RUNTIME_MODEL_TEMPERATURE: "not-a-number",
      WARRANT_RUNTIME_MODEL_TOP_P: "not-a-number",
      WARRANT_RUNTIME_MODEL_MAX_OUTPUT_TOKENS: "1.5",
    } as unknown as NodeJS.ProcessEnv);

    expect(validation.ok).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "WARRANT_RUNTIME_MODEL_TEMPERATURE",
        }),
        expect.objectContaining({
          field: "WARRANT_RUNTIME_MODEL_TOP_P",
        }),
        expect.objectContaining({
          field: "WARRANT_RUNTIME_MODEL_MAX_OUTPUT_TOKENS",
        }),
      ]),
    );
  });
});

describe("structured runtime model invocation", () => {
  it("returns schema-validated output on first attempt", async () => {
    const previousEnv = process.env;
    process.env = {
      ...previousEnv,
      GOOGLE_API_KEY: "local-test-key",
    };

    try {
      const result = await invokeRuntimeModelStructuredOutput(
        {
          role: "planner",
          task: "Create a short planning response",
          prompt: "Return a concise plan",
          schema: plannerOutputSchema,
        },
        createTransportWithResponses([
          JSON.stringify({
            summary: "Calendar context gathered.",
            nextActions: ["Draft investor follow-up", "Request send approval"],
          }),
        ]),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(result.attempts).toBe(1);
      expect(result.repaired).toBe(false);
      expect(result.value.summary).toBe("Calendar context gathered.");
      expect(result.value.nextActions).toHaveLength(2);
    } finally {
      process.env = previousEnv;
    }
  });

  it("retries once with repair prompt when first output fails schema", async () => {
    const previousEnv = process.env;
    process.env = {
      ...previousEnv,
      GOOGLE_API_KEY: "local-test-key",
    };

    try {
      const result = await invokeRuntimeModelStructuredOutput(
        {
          role: "planner",
          task: "Create a short planning response",
          prompt: "Return structured output",
          schema: plannerOutputSchema,
        },
        createTransportWithResponses([
          JSON.stringify({
            summary: 42,
            nextActions: ["Draft investor follow-up"],
          }),
          JSON.stringify({
            summary: "Draft is ready.",
            nextActions: ["Request approval"],
          }),
        ]),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(result.attempts).toBe(2);
      expect(result.repaired).toBe(true);
      expect(result.value.summary).toBe("Draft is ready.");
    } finally {
      process.env = previousEnv;
    }
  });

  it("returns structured failure after one repair retry if output remains invalid", async () => {
    const previousEnv = process.env;
    process.env = {
      ...previousEnv,
      GOOGLE_API_KEY: "local-test-key",
    };

    try {
      const result = await invokeRuntimeModelStructuredOutput(
        {
          role: "planner",
          task: "Create a short planning response",
          prompt: "Return structured output",
          schema: plannerOutputSchema,
        },
        createTransportWithResponses([
          JSON.stringify({
            summary: "Valid summary",
            nextActions: [1],
          }),
          "still not valid JSON output",
        ]),
      );

      expect(result.ok).toBe(false);
      if (result.ok) {
        return;
      }

      expect(result.attempts).toBe(2);
      expect(result.repaired).toBe(true);
      expect(result.failure.code).toBe("output-not-json");
      expect(result.failure.validationErrors).toEqual([
        "Model output was not valid JSON.",
      ]);
    } finally {
      process.env = previousEnv;
    }
  });
});
