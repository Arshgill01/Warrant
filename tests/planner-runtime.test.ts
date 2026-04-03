import { describe, expect, it } from "vitest";
import type { SharedModelAdapter } from "@/contracts";
import { runPlannerRuntime } from "@/agents/planner-runtime";
import { createDeterministicPlannerModelAdapter } from "@/agents/model-adapter";
import { issueRootWarrant } from "@/warrants";

const parentWarrant = issueRootWarrant({
  id: "warrant-planner-root-test",
  rootRequestId: "request-planner-runtime-test",
  createdBy: "user-test",
  agentId: "agent-planner-001",
  purpose: "Plan bounded child delegation for investor update coordination.",
  capabilities: ["calendar.read", "gmail.draft", "gmail.send", "warrant.issue"],
  resourceConstraints: {
    allowedDomains: ["northstar.vc"],
    allowedRecipients: ["partners@northstar.vc", "finance@northstar.vc"],
    maxDrafts: 2,
    maxSends: 1,
  },
  canDelegate: true,
  maxChildren: 2,
  createdAt: "2026-04-17T09:01:00.000Z",
  expiresAt: "2026-04-18T18:00:00.000Z",
});

function createQueueAdapter(outputs: Array<unknown | Error>): SharedModelAdapter {
  let index = 0;

  return {
    name: "queue-adapter",
    invokeStructured(): unknown {
      const item = outputs[index] ?? outputs.at(-1);
      index += 1;

      if (item instanceof Error) {
        throw item;
      }

      return item;
    },
  };
}

describe("planner runtime", () => {
  it("returns a valid structured plan through the shared model adapter", () => {
    const result = runPlannerRuntime(
      {
        rootRequestId: parentWarrant.rootRequestId,
        goal: "Prepare my investor update for tomorrow and coordinate follow-ups.",
        now: "2026-04-17T09:01:30.000Z",
        parentWarrant,
      },
      { modelAdapter: createDeterministicPlannerModelAdapter() },
    );

    expect(result.source).toBe("model");
    expect(result.attemptCount).toBe(1);
    expect(result.usedRepair).toBe(false);
    expect(result.plan.delegationDrafts).toEqual([
      expect.objectContaining({
        childRole: "calendar",
        requestedCapabilities: ["calendar.read"],
      }),
      expect.objectContaining({
        childRole: "comms",
        requestedCapabilities: ["gmail.draft", "gmail.send"],
      }),
    ]);
    expect(result.events.map((event) => event.kind)).toEqual([
      "planner.started",
      "planner.plan.valid",
    ]);
  });

  it("repairs invalid schema output with one retry", () => {
    const adapter = createQueueAdapter([
      { delegationDrafts: [] },
      {
        goalInterpretation: "Coordinate bounded child delegation.",
        delegationDrafts: [
          {
            childRole: "calendar",
            objective: "Read tomorrow calendar context.",
            requestedCapabilities: ["calendar.read"],
          },
          {
            childRole: "comms",
            objective: "Draft follow-up emails.",
            requestedCapabilities: ["gmail.draft"],
          },
        ],
      },
    ]);

    const result = runPlannerRuntime(
      {
        rootRequestId: parentWarrant.rootRequestId,
        goal: "Prepare my investor update for tomorrow and coordinate follow-ups.",
        now: "2026-04-17T09:01:30.000Z",
        parentWarrant,
      },
      { modelAdapter: adapter },
    );

    expect(result.source).toBe("model");
    expect(result.attemptCount).toBe(2);
    expect(result.usedRepair).toBe(true);
    expect(result.events.map((event) => event.kind)).toEqual([
      "planner.started",
      "planner.output.invalid",
      "planner.plan.valid",
    ]);
  });

  it("falls back deterministically after two invalid outputs", () => {
    const adapter = createQueueAdapter([
      { goalInterpretation: "bad", delegationDrafts: [{ childRole: "comms" }] },
      { goalInterpretation: "still bad", delegationDrafts: [{ childRole: "calendar" }] },
    ]);

    const result = runPlannerRuntime(
      {
        rootRequestId: parentWarrant.rootRequestId,
        goal: "Prepare my investor update for tomorrow and coordinate follow-ups.",
        now: "2026-04-17T09:01:30.000Z",
        parentWarrant,
      },
      { modelAdapter: adapter },
    );

    expect(result.source).toBe("fallback");
    expect(result.plan.delegationDrafts).toEqual([
      expect.objectContaining({
        childRole: "calendar",
        requestedCapabilities: ["calendar.read"],
      }),
      expect.objectContaining({
        childRole: "comms",
        requestedCapabilities: ["gmail.draft"],
      }),
    ]);
    expect(result.events.map((event) => event.kind)).toEqual([
      "planner.started",
      "planner.output.invalid",
      "planner.output.invalid",
      "planner.fallback.used",
    ]);
  });

  it("emits planner.failed events and still degrades safely when the model throws", () => {
    const adapter = createQueueAdapter([
      new Error("adapter timeout"),
      new Error("adapter timeout"),
    ]);

    const result = runPlannerRuntime(
      {
        rootRequestId: parentWarrant.rootRequestId,
        goal: "Prepare my investor update for tomorrow and coordinate follow-ups.",
        now: "2026-04-17T09:01:30.000Z",
        parentWarrant,
      },
      { modelAdapter: adapter },
    );

    expect(result.source).toBe("fallback");
    expect(result.failureReason).toBe("adapter timeout");
    expect(result.events.map((event) => event.kind)).toEqual([
      "planner.started",
      "planner.failed",
      "planner.failed",
      "planner.fallback.used",
    ]);
  });
});

