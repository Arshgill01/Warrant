import type { ActionKind } from "@/contracts";

export type ChildRuntimeRole = "calendar" | "comms";

export interface RuntimeIdentity {
  id: string;
  role: ChildRuntimeRole;
  label: string;
}

export type RuntimeEventKind =
  | "runtime.started"
  | "runtime.output.valid"
  | "runtime.output.invalid"
  | "runtime.repair.requested"
  | "runtime.repair.succeeded"
  | "runtime.degraded"
  | "runtime.failed";

export interface RuntimeEvent {
  kind: RuntimeEventKind;
  runtimeId: string;
  role: ChildRuntimeRole;
  at: string;
  detail: string;
}

export interface RuntimeFailure {
  code: "invalid_output" | "model_error";
  message: string;
  attempts: number;
  lastRawOutput: unknown;
}

export interface RuntimeSuccessResult<Output> {
  ok: true;
  runtime: RuntimeIdentity;
  attempts: number;
  output: Output;
  degraded: boolean;
  events: RuntimeEvent[];
}

export interface RuntimeFailureResult {
  ok: false;
  runtime: RuntimeIdentity;
  attempts: number;
  failure: RuntimeFailure;
  events: RuntimeEvent[];
}

export type RuntimeExecutionResult<Output> =
  | RuntimeSuccessResult<Output>
  | RuntimeFailureResult;

export interface CalendarReasoningInput {
  requestId: string;
  warrantId: string;
  objective: string;
  timezone: string;
  now: string;
  window: {
    startsAt: string;
    endsAt: string;
  };
  context: {
    knownCommitments: Array<{
      title: string;
      startsAt: string;
      endsAt: string;
    }>;
    constraints: string[];
  };
  allowedCapabilities: ActionKind[];
}

export interface CalendarReadProposal {
  kind: "calendar.read";
  startsAt: string;
  endsAt: string;
  rationale: string;
}

export interface CalendarScheduleProposal {
  kind: "calendar.schedule";
  scheduledFor: string;
  rationale: string;
}

export type CalendarRuntimeProposal =
  | CalendarReadProposal
  | CalendarScheduleProposal;

export interface CalendarRuntimeOutput {
  reasoning: string;
  scheduleSummary: {
    headline: string;
    keyPoints: string[];
    riskLevel: "low" | "medium" | "high";
  } | null;
  proposals: CalendarRuntimeProposal[];
}

export interface CommsReasoningInput {
  requestId: string;
  warrantId: string;
  objective: string;
  now: string;
  context: {
    recipients: string[];
    sender: string;
    constraints: string[];
    priorThreadSummary: string | null;
  };
  allowedCapabilities: ActionKind[];
}

export interface CommsDraft {
  subject: string;
  bodyText: string;
  to: string[];
  cc: string[];
}

export interface CommsSendProposal {
  kind: "gmail.send";
  reason: string;
  recipients: string[];
  requiresApproval: true;
}

export interface CommsRuntimeOutput {
  reasoning: string;
  draft: CommsDraft;
  sendProposal: CommsSendProposal | null;
}
