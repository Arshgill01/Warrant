import type {
  ModelAdapterRequest,
  SharedModelAdapter,
} from "@/contracts";

export function createDeterministicPlannerModelAdapter(): SharedModelAdapter {
  return {
    name: "deterministic-planner-model",
    invokeStructured(request: ModelAdapterRequest): unknown {
      return {
        goalInterpretation:
          "Prepare tomorrow's investor update, gather schedule context, and coordinate bounded follow-up comms.",
        delegationDrafts: [
          {
            childRole: "calendar",
            objective: "Read tomorrow's bounded calendar window before comms work begins.",
            requestedCapabilities: ["calendar.read"],
          },
          {
            childRole: "comms",
            objective:
              "Draft investor follow-up emails and request one bounded send that still requires explicit approval.",
            requestedCapabilities: ["gmail.draft", "gmail.send"],
          },
        ],
        adapterMetadata: {
          adapter: "deterministic",
          attempt: request.attempt,
        },
      };
    },
  };
}

