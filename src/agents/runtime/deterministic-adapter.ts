import type {
  RuntimeModelAdapter,
  RuntimeModelInvocation,
  RuntimeModelResponse,
} from "@/agents/runtime/model-adapter";
import type {
  CalendarReasoningInput,
  CalendarRuntimeOutput,
  CommsReasoningInput,
  CommsRuntimeOutput,
} from "@/agents/runtime/types";

const DETERMINISTIC_RUNTIME_MODEL = "deterministic-runtime-model-v1";

function buildCalendarOutput(input: CalendarReasoningInput): CalendarRuntimeOutput {
  const proposals: CalendarRuntimeOutput["proposals"] = [];

  if (input.allowedCapabilities.includes("calendar.read")) {
    proposals.push({
      kind: "calendar.read",
      startsAt: input.window.startsAt,
      endsAt: input.window.endsAt,
      rationale: "Read the bounded calendar window before comms coordination.",
    });
  }

  if (input.allowedCapabilities.includes("calendar.schedule")) {
    proposals.push({
      kind: "calendar.schedule",
      scheduledFor: input.window.startsAt,
      rationale: "Schedule only inside the delegated calendar window.",
    });
  }

  return {
    reasoning:
      "Review known commitments first, then propose only bounded calendar actions.",
    scheduleSummary: {
      headline: "Morning window has one prep block and follow-up space.",
      keyPoints: [
        "Investor prep is already blocked in the morning window.",
        "Follow-up coordination can proceed after availability is confirmed.",
      ],
      riskLevel: "low",
    },
    proposals,
  };
}

function buildCommsOutput(input: CommsReasoningInput): CommsRuntimeOutput {
  const recipients = [...input.context.recipients];

  return {
    reasoning:
      "Draft first for approved recipients. Separate send intent from execution.",
    draft: {
      subject: "Investor update follow-up for April 18",
      bodyText:
        "Prepared the follow-up draft for tomorrow's investor update. Please confirm owners and next asks before sending.",
      to: recipients,
      cc: [input.context.sender],
    },
    sendProposal: input.allowedCapabilities.includes("gmail.send")
      ? {
          kind: "gmail.send",
          reason:
            "One bounded follow-up send may proceed only after explicit human approval.",
          recipients,
          requiresApproval: true,
        }
      : null,
  };
}

export function createDeterministicChildRuntimeModelAdapter(): RuntimeModelAdapter {
  return {
    invoke(input: RuntimeModelInvocation): RuntimeModelResponse {
      switch (input.role) {
        case "calendar":
          return {
            rawOutput: buildCalendarOutput(input.input as CalendarReasoningInput),
            model: DETERMINISTIC_RUNTIME_MODEL,
          };
        case "comms":
          return {
            rawOutput: buildCommsOutput(input.input as CommsReasoningInput),
            model: DETERMINISTIC_RUNTIME_MODEL,
          };
      }
    },
  };
}
