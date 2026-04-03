import type { RuntimeModelAdapter } from "@/agents/runtime/model-adapter";
import type {
  RuntimeEvent,
  RuntimeExecutionResult,
  RuntimeIdentity,
} from "@/agents/runtime/types";

interface InvokeValidatedRuntimeInput<Input, Output> {
  runtime: RuntimeIdentity;
  schemaName: string;
  prompt: string;
  runtimeInput: Input;
  now: string;
  modelAdapter: RuntimeModelAdapter;
  repairHint: string;
  invalidOutputMessage: string;
  validate: (rawOutput: unknown, runtimeInput: Input) => rawOutput is Output;
}

function runtimeEvent(input: {
  kind: RuntimeEvent["kind"];
  runtime: RuntimeIdentity;
  at: string;
  detail: string;
}): RuntimeEvent {
  return {
    kind: input.kind,
    runtimeId: input.runtime.id,
    role: input.runtime.role,
    at: input.at,
    detail: input.detail,
  };
}

export async function invokeWithValidationAndRepair<Input, Output>(
  input: InvokeValidatedRuntimeInput<Input, Output>,
): Promise<RuntimeExecutionResult<Output>> {
  const events: RuntimeEvent[] = [
    runtimeEvent({
      kind: "runtime.started",
      runtime: input.runtime,
      at: input.now,
      detail: `${input.runtime.label} invocation started.`,
    }),
  ];

  let firstOutput: unknown;

  try {
    const firstResponse = await input.modelAdapter.invoke({
      runtime: input.runtime,
      role: input.runtime.role,
      schemaName: input.schemaName,
      prompt: input.prompt,
      input: input.runtimeInput,
      repairHint: null,
    });
    firstOutput = firstResponse.rawOutput;
  } catch (error) {
    events.push(
      runtimeEvent({
        kind: "runtime.failed",
        runtime: input.runtime,
        at: input.now,
        detail: `${input.runtime.label} model invocation failed before producing structured output.`,
      }),
    );

    return {
      ok: false,
      runtime: input.runtime,
      attempts: 1,
      failure: {
        code: "model_error",
        message: error instanceof Error ? error.message : "Runtime model invocation failed.",
        attempts: 1,
        lastRawOutput: null,
      },
      events,
    };
  }

  if (input.validate(firstOutput, input.runtimeInput)) {
    events.push(
      runtimeEvent({
        kind: "runtime.output.valid",
        runtime: input.runtime,
        at: input.now,
        detail: `${input.runtime.label} output passed structured validation on the first attempt.`,
      }),
    );

    return {
      ok: true,
      runtime: input.runtime,
      attempts: 1,
      output: firstOutput,
      degraded: false,
      events,
    };
  }

  events.push(
    runtimeEvent({
      kind: "runtime.output.invalid",
      runtime: input.runtime,
      at: input.now,
      detail: `${input.runtime.label} output failed validation on attempt 1.`,
    }),
    runtimeEvent({
      kind: "runtime.repair.requested",
      runtime: input.runtime,
      at: input.now,
      detail: `${input.runtime.label} requested one structured-output repair retry.`,
    }),
  );

  let repairedOutput: unknown;

  try {
    const repairResponse = await input.modelAdapter.invoke({
      runtime: input.runtime,
      role: input.runtime.role,
      schemaName: input.schemaName,
      prompt: input.prompt,
      input: input.runtimeInput,
      repairHint: input.repairHint,
    });
    repairedOutput = repairResponse.rawOutput;
  } catch (error) {
    events.push(
      runtimeEvent({
        kind: "runtime.degraded",
        runtime: input.runtime,
        at: input.now,
        detail: `${input.runtime.label} entered degraded mode because repair invocation failed.`,
      }),
      runtimeEvent({
        kind: "runtime.failed",
        runtime: input.runtime,
        at: input.now,
        detail: `${input.runtime.label} failed after repair invocation error.`,
      }),
    );

    return {
      ok: false,
      runtime: input.runtime,
      attempts: 2,
      failure: {
        code: "model_error",
        message: error instanceof Error ? error.message : "Runtime repair invocation failed.",
        attempts: 2,
        lastRawOutput: firstOutput,
      },
      events,
    };
  }

  if (input.validate(repairedOutput, input.runtimeInput)) {
    events.push(
      runtimeEvent({
        kind: "runtime.repair.succeeded",
        runtime: input.runtime,
        at: input.now,
        detail: `${input.runtime.label} repair retry produced valid structured output.`,
      }),
      runtimeEvent({
        kind: "runtime.degraded",
        runtime: input.runtime,
        at: input.now,
        detail: `${input.runtime.label} continued in degraded mode after invalid-first-output recovery.`,
      }),
    );

    return {
      ok: true,
      runtime: input.runtime,
      attempts: 2,
      output: repairedOutput,
      degraded: true,
      events,
    };
  }

  events.push(
    runtimeEvent({
      kind: "runtime.output.invalid",
      runtime: input.runtime,
      at: input.now,
      detail: `${input.runtime.label} repair output failed validation on attempt 2.`,
    }),
    runtimeEvent({
      kind: "runtime.degraded",
      runtime: input.runtime,
      at: input.now,
      detail: `${input.runtime.label} entered degraded mode after two invalid outputs.`,
    }),
    runtimeEvent({
      kind: "runtime.failed",
      runtime: input.runtime,
      at: input.now,
      detail: `${input.runtime.label} failed after exhausting one repair retry.`,
    }),
  );

  return {
    ok: false,
    runtime: input.runtime,
    attempts: 2,
    failure: {
      code: "invalid_output",
      message: input.invalidOutputMessage,
      attempts: 2,
      lastRawOutput: repairedOutput,
    },
    events,
  };
}
