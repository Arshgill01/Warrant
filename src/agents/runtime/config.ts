export type RuntimeModelProvider = "google-genai";
export type RuntimeLogicalModel = "gemma-4-31b";

export interface RuntimeModelDefaults {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  responseMimeType: "application/json";
}

export interface RuntimeModelConfiguration {
  provider: RuntimeModelProvider;
  logicalModel: RuntimeLogicalModel;
  providerModelId: string;
  apiKey: string | null;
  defaults: RuntimeModelDefaults;
}

export interface RuntimeModelConfigurationIssue {
  code: "missing" | "invalid";
  field: string;
  message: string;
}

export interface RuntimeModelStartupValidation {
  ok: boolean;
  configuration: RuntimeModelConfiguration;
  issues: RuntimeModelConfigurationIssue[];
}

const runtimeModelProvider: RuntimeModelProvider = "google-genai";
const runtimeLogicalModel: RuntimeLogicalModel = "gemma-4-31b";

// Keep logical-to-provider mapping centralized here so SDK identifier changes stay isolated.
const runtimeProviderModelMap: Record<RuntimeLogicalModel, string> = {
  "gemma-4-31b": "gemma-4-31b-it",
};

const runtimeDefaults: RuntimeModelDefaults = {
  temperature: 0.1,
  topP: 0.1,
  maxOutputTokens: 2048,
  responseMimeType: "application/json",
};

function readOptionalValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function readNumberOverride(value: string | undefined, fallback: number): number {
  const normalized = readOptionalValue(value);

  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readRuntimeModelConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeModelConfiguration {
  const providerModelId =
    readOptionalValue(env.WARRANT_RUNTIME_MODEL_PROVIDER_ID) ??
    runtimeProviderModelMap[runtimeLogicalModel];

  return {
    provider: runtimeModelProvider,
    logicalModel: runtimeLogicalModel,
    providerModelId,
    apiKey: readOptionalValue(env.GOOGLE_API_KEY),
    defaults: {
      temperature: readNumberOverride(
        env.WARRANT_RUNTIME_MODEL_TEMPERATURE,
        runtimeDefaults.temperature,
      ),
      topP: readNumberOverride(env.WARRANT_RUNTIME_MODEL_TOP_P, runtimeDefaults.topP),
      maxOutputTokens: readNumberOverride(
        env.WARRANT_RUNTIME_MODEL_MAX_OUTPUT_TOKENS,
        runtimeDefaults.maxOutputTokens,
      ),
      responseMimeType: runtimeDefaults.responseMimeType,
    },
  };
}

export function validateRuntimeModelStartup(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeModelStartupValidation {
  const configuration = readRuntimeModelConfiguration(env);
  const issues: RuntimeModelConfigurationIssue[] = [];

  if (!configuration.apiKey) {
    issues.push({
      code: "missing",
      field: "GOOGLE_API_KEY",
      message:
        "Missing GOOGLE_API_KEY. Store it in a local ignored env file such as .env.local.",
    });
  }

  if (!configuration.providerModelId.trim()) {
    issues.push({
      code: "invalid",
      field: "WARRANT_RUNTIME_MODEL_PROVIDER_ID",
      message: "Provider model identifier cannot be empty.",
    });
  }

  if (configuration.defaults.temperature < 0 || configuration.defaults.temperature > 1) {
    issues.push({
      code: "invalid",
      field: "WARRANT_RUNTIME_MODEL_TEMPERATURE",
      message: "Temperature must be between 0 and 1.",
    });
  }

  if (configuration.defaults.topP <= 0 || configuration.defaults.topP > 1) {
    issues.push({
      code: "invalid",
      field: "WARRANT_RUNTIME_MODEL_TOP_P",
      message: "Top-p must be greater than 0 and at most 1.",
    });
  }

  if (configuration.defaults.maxOutputTokens < 1) {
    issues.push({
      code: "invalid",
      field: "WARRANT_RUNTIME_MODEL_MAX_OUTPUT_TOKENS",
      message: "Max output tokens must be at least 1.",
    });
  }

  return {
    ok: issues.length === 0,
    configuration,
    issues,
  };
}

export function getRuntimeModelStartupValidation(): RuntimeModelStartupValidation {
  return validateRuntimeModelStartup();
}

export function assertRuntimeModelStartup(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeModelConfiguration {
  const startup = validateRuntimeModelStartup(env);

  if (!startup.ok) {
    const details = startup.issues
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join("; ");
    throw new Error(`Runtime model startup validation failed. ${details}`);
  }

  return startup.configuration;
}
