import { describe, expect, it } from "vitest";
import {
  runCalendarRuntime,
  runCommsRuntime,
} from "@/agents";
import type {
  RuntimeModelAdapter,
  RuntimeModelInvocation,
  RuntimeModelResponse,
} from "@/agents/runtime/model-adapter";
import type {
  CalendarReasoningInput,
  CommsReasoningInput,
} from "@/agents/runtime";

class ScriptedRuntimeAdapter implements RuntimeModelAdapter {
  public readonly invocations: RuntimeModelInvocation[] = [];

  public constructor(
    private readonly scriptedOutputs: Array<unknown | Error>,
    private readonly model = "scripted-model-v1",
  ) {}

  async invoke(input: RuntimeModelInvocation): Promise<RuntimeModelResponse> {
    this.invocations.push(input);
    const index = this.invocations.length - 1;
    const output = this.scriptedOutputs[index];

    if (output instanceof Error) {
      throw output;
    }

    if (typeof output === "undefined") {
      throw new Error("No scripted output available for runtime invocation.");
    }

    return {
      rawOutput: output,
      model: this.model,
    };
  }
}

function buildCalendarInput(): CalendarReasoningInput {
  return {
    requestId: "request-calendar-001",
    warrantId: "warrant-calendar-child-001",
    objective: "Review tomorrow's schedule and propose the minimum calendar reads.",
    timezone: "America/Los_Angeles",
    now: "2026-04-17T09:05:00.000Z",
    window: {
      startsAt: "2026-04-18T08:00:00.000Z",
      endsAt: "2026-04-18T12:00:00.000Z",
    },
    context: {
      knownCommitments: [
        {
          title: "Investor update prep",
          startsAt: "2026-04-18T09:00:00.000Z",
          endsAt: "2026-04-18T09:30:00.000Z",
        },
      ],
      constraints: ["Stay within the warrant window", "No email actions"],
    },
    allowedCapabilities: ["calendar.read", "calendar.schedule"],
  };
}

function buildCommsInput(capabilities: CommsReasoningInput["allowedCapabilities"]): CommsReasoningInput {
  return {
    requestId: "request-comms-001",
    warrantId: "warrant-comms-child-001",
    objective: "Draft investor follow-up email.",
    now: "2026-04-17T09:07:00.000Z",
    context: {
      recipients: ["partners@northstar.vc", "finance@northstar.vc"],
      sender: "maya@northstar.vc",
      constraints: ["Draft first", "Send requires approval"],
      priorThreadSummary: "Recipients asked for KPI and milestone updates.",
    },
    allowedCapabilities: capabilities,
  };
}

describe("child runtimes", () => {
  it("runs calendar runtime with valid output on first attempt", async () => {
    const adapter = new ScriptedRuntimeAdapter([
      {
        reasoning: "I should read morning availability and summarize conflict risk.",
        scheduleSummary: {
          headline: "Morning schedule has one prep meeting and open follow-up slots.",
          keyPoints: ["9:00 prep already booked", "10:00 and 11:00 are open"],
          riskLevel: "low",
        },
        proposals: [
          {
            kind: "calendar.read",
            startsAt: "2026-04-18T08:00:00.000Z",
            endsAt: "2026-04-18T12:00:00.000Z",
            rationale: "Need bounded read for final scheduling context.",
          },
        ],
      },
    ]);

    const result = await runCalendarRuntime({
      modelAdapter: adapter,
      runtimeInput: buildCalendarInput(),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.runtime.role).toBe("calendar");
    expect(result.attempts).toBe(1);
    expect(result.degraded).toBe(false);
    expect(result.output.proposals[0]?.kind).toBe("calendar.read");
    expect(adapter.invocations).toHaveLength(1);
    expect(adapter.invocations[0]?.role).toBe("calendar");
    expect(adapter.invocations[0]?.schemaName).toBe("calendar_runtime_output");
  });

  it("repairs calendar runtime once after invalid output and emits degraded events", async () => {
    const adapter = new ScriptedRuntimeAdapter([
      {
        reasoning: 42,
        proposals: "invalid",
      },
      {
        reasoning: "Repair: summarize and propose bounded read only.",
        scheduleSummary: {
          headline: "Schedule summary ready.",
          keyPoints: ["Morning review required"],
          riskLevel: "medium",
        },
        proposals: [
          {
            kind: "calendar.read",
            startsAt: "2026-04-18T08:00:00.000Z",
            endsAt: "2026-04-18T12:00:00.000Z",
            rationale: "Repair path bounded read proposal.",
          },
        ],
      },
    ]);

    const result = await runCalendarRuntime({
      modelAdapter: adapter,
      runtimeInput: buildCalendarInput(),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.attempts).toBe(2);
    expect(result.degraded).toBe(true);
    expect(result.events.map((event) => event.kind)).toEqual([
      "runtime.started",
      "runtime.output.invalid",
      "runtime.repair.requested",
      "runtime.repair.succeeded",
      "runtime.degraded",
    ]);
    expect(adapter.invocations[1]?.repairHint).not.toBeNull();
  });

  it("returns structured calendar failure after invalid output and failed repair", async () => {
    const adapter = new ScriptedRuntimeAdapter([
      { reasoning: "bad first", proposals: [] },
      { reasoning: "bad second", proposals: [{ kind: "gmail.send" }] },
    ]);

    const result = await runCalendarRuntime({
      modelAdapter: adapter,
      runtimeInput: buildCalendarInput(),
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.code).toBe("invalid_output");
    expect(result.attempts).toBe(2);
    expect(result.events.map((event) => event.kind)).toEqual([
      "runtime.started",
      "runtime.output.invalid",
      "runtime.repair.requested",
      "runtime.output.invalid",
      "runtime.degraded",
      "runtime.failed",
    ]);
  });

  it("keeps comms draft generation separate from optional send proposal", async () => {
    const adapter = new ScriptedRuntimeAdapter([
      {
        reasoning: "Draft the follow-up and do not propose send without capability.",
        draft: {
          subject: "Investor update follow-up",
          bodyText: "Sharing updates and next steps for tomorrow.",
          to: ["partners@northstar.vc"],
          cc: ["finance@northstar.vc"],
        },
        sendProposal: null,
      },
    ]);

    const result = await runCommsRuntime({
      modelAdapter: adapter,
      runtimeInput: buildCommsInput(["gmail.draft"]),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.runtime.role).toBe("comms");
    expect(result.output.sendProposal).toBeNull();
    expect(result.output.draft.subject).toMatch(/follow-up/i);
    expect(adapter.invocations[0]?.role).toBe("comms");
    expect(adapter.invocations[0]?.schemaName).toBe("comms_runtime_output");
  });

  it("repairs comms output when send proposal exceeds role capabilities", async () => {
    const adapter = new ScriptedRuntimeAdapter([
      {
        reasoning: "I will draft and also propose sending now.",
        draft: {
          subject: "Investor update follow-up",
          bodyText: "Please review.",
          to: ["partners@northstar.vc"],
          cc: [],
        },
        sendProposal: {
          kind: "gmail.send",
          reason: "Send immediately",
          recipients: ["partners@northstar.vc"],
          requiresApproval: true,
        },
      },
      {
        reasoning: "Repair: draft only because send is not allowed.",
        draft: {
          subject: "Investor update follow-up",
          bodyText: "Please review.",
          to: ["partners@northstar.vc"],
          cc: [],
        },
        sendProposal: null,
      },
    ]);

    const result = await runCommsRuntime({
      modelAdapter: adapter,
      runtimeInput: buildCommsInput(["gmail.draft"]),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.attempts).toBe(2);
    expect(result.degraded).toBe(true);
    expect(result.output.sendProposal).toBeNull();
    expect(result.events.map((event) => event.kind)).toContain("runtime.repair.succeeded");
  });

  it("returns structured comms failure after invalid output on both attempts", async () => {
    const adapter = new ScriptedRuntimeAdapter([
      {
        reasoning: "bad",
        draft: {
          subject: "bad",
          bodyText: "bad",
          to: ["outside@external.com"],
          cc: [],
        },
        sendProposal: null,
      },
      {
        reasoning: "still bad",
        draft: {
          subject: "bad",
          bodyText: "bad",
          to: ["outside@external.com"],
          cc: [],
        },
        sendProposal: null,
      },
    ]);

    const result = await runCommsRuntime({
      modelAdapter: adapter,
      runtimeInput: buildCommsInput(["gmail.draft"]),
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.code).toBe("invalid_output");
    expect(result.attempts).toBe(2);
    expect(result.events.map((event) => event.kind)).toEqual([
      "runtime.started",
      "runtime.output.invalid",
      "runtime.repair.requested",
      "runtime.output.invalid",
      "runtime.degraded",
      "runtime.failed",
    ]);
  });
});
