import type { ChildRuntimeRole, RuntimeIdentity } from "@/agents/runtime/types";

export interface RuntimeModelInvocation {
  runtime: RuntimeIdentity;
  role: ChildRuntimeRole;
  schemaName: string;
  prompt: string;
  input: unknown;
  repairHint: string | null;
}

export interface RuntimeModelResponse {
  rawOutput: unknown;
  model: string;
}

export interface RuntimeModelAdapter {
  invoke(input: RuntimeModelInvocation): RuntimeModelResponse;
}
