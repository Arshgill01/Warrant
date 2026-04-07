import { invokeRuntimeModel } from "@/agents/runtime";
import { getRuntimeModelStartupValidation } from "@/agents/runtime/config";

interface LiveProbeCallResult {
  role: "planner" | "calendar" | "comms";
  ok: boolean;
  requestId: string | null;
  preview: string;
  failure: string | null;
}

function previewText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.slice(0, 180);
}

async function probeRole(input: {
  role: "planner" | "calendar" | "comms";
  task: string;
  prompt: string;
  context: string;
}): Promise<LiveProbeCallResult> {
  const result = await invokeRuntimeModel({
    role: input.role,
    task: input.task,
    prompt: input.prompt,
    context: input.context,
  });

  if (!result.ok) {
    return {
      role: input.role,
      ok: false,
      requestId: null,
      preview: "",
      failure: `${result.failure.code}: ${result.failure.message}`,
    };
  }

  const text = result.response.text.trim();
  return {
    role: input.role,
    ok: text.length > 0,
    requestId: result.response.requestId,
    preview: previewText(text),
    failure: text.length > 0 ? null : "empty_response",
  };
}

function fail(stage: string, details: Record<string, unknown>): never {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage,
        ...details,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

async function main() {
  const startup = getRuntimeModelStartupValidation();
  if (!startup.ok) {
    fail("runtime_startup", {
      configuration: {
        provider: startup.configuration.provider,
        logicalModel: startup.configuration.logicalModel,
        providerModelId: startup.configuration.providerModelId,
      },
      issues: startup.issues,
    });
  }

  const checkedAt = new Date().toISOString();
  const sharedGoal = "Prepare my investor update for tomorrow and coordinate follow-ups.";

  const [planner, calendar, comms] = await Promise.all([
    probeRole({
      role: "planner",
      task: "Create a concise delegation outline for this goal.",
      prompt:
        "Return 3 bullet points: planner objective, calendar branch objective, comms branch objective.",
      context: sharedGoal,
    }),
    probeRole({
      role: "calendar",
      task: "Generate bounded calendar reasoning only.",
      prompt:
        "Summarize what calendar context is needed before follow-up comms. Keep it short.",
      context: "Window: tomorrow morning. Capability boundary: calendar.read only.",
    }),
    probeRole({
      role: "comms",
      task: "Generate bounded comms reasoning only.",
      prompt:
        "Draft/send separation check: explain draft-first behavior and approval requirement in 2 sentences.",
      context:
        "Approved recipients: partners@northstar.vc, finance@northstar.vc. Do not claim execution happened.",
    }),
  ]);

  const calls = [planner, calendar, comms];
  const failures = calls.filter((call) => !call.ok);
  if (failures.length > 0) {
    fail("live_model_calls", {
      runtimeConfiguration: {
        provider: startup.configuration.provider,
        logicalModel: startup.configuration.logicalModel,
        providerModelId: startup.configuration.providerModelId,
      },
      failures,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedAt,
        runtimeConfiguration: {
          provider: startup.configuration.provider,
          logicalModel: startup.configuration.logicalModel,
          providerModelId: startup.configuration.providerModelId,
        },
        calls,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  fail("unexpected_error", {
    message: error instanceof Error ? error.message : String(error),
  });
});
