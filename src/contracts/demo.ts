import type {
  ActionAttempt,
  ActionAttemptOutcome,
  ProviderActionState,
  ActionAuthorizationSnapshot,
} from "@/contracts/action";
import type { AgentIdentity, AgentStatus } from "@/contracts/agent";
import type { ApprovalRequest } from "@/contracts/approval";
import type { LedgerEvent, RevocationRecord } from "@/contracts/audit";
import type {
  RuntimeControlEvent,
  RuntimeProposalControlDecision,
} from "@/contracts/runtime";
import type { WarrantContract } from "@/contracts/warrant";

export type ExternalSystem = "gmail" | "google-calendar" | "google-docs";
export type DemoActionOutcome = ActionAttemptOutcome;

export interface DemoUser {
  id: string;
  label: string;
  email: string;
  timezone: string;
}

export interface DemoAgent extends AgentIdentity {
  runtimeActorId: string;
  runtimeActorLabel: string;
  status: AgentStatus;
  purpose: string;
  summary: string;
  warrantId: string;
  parentAgentId: string | null;
  externalSystems: ExternalSystem[];
}

export interface DemoActionAttempt extends ActionAttempt {
  rootRequestId: string;
  parentWarrantId: string | null;
  createdAt: string;
  summary: string;
  resource: string;
  outcome: DemoActionOutcome;
  outcomeReason: string;
  authorization: ActionAuthorizationSnapshot;
  approvalRequestId?: string;
  providerState?: ProviderActionState | null;
  providerHeadline?: string | null;
  providerDetail?: string | null;
}

export type DemoApprovalRequest = ApprovalRequest;

export interface DemoScenarioExamples {
  calendarChildWarrantId: string;
  commsChildWarrantId: string;
  calendarActionId: string;
  commsDraftActionId: string;
  commsOverreachActionId: string;
  commsSendActionId: string;
  commsSendApprovalId: string;
}

export type DemoLivePreflightMode = "token-only" | "live";
export type DemoRuntimeMode = DemoLivePreflightMode | "seeded";
export type DemoRuntimeLane = "live-token-only" | "live-provider" | "seeded-fallback";

export interface DemoRuntimeExecutionSnapshot {
  requestedMode: DemoRuntimeMode;
  lane: DemoRuntimeLane;
  modelSource: "live-gemma" | "seeded-deterministic";
  providerSource: "provider-backed" | "token-only-simulated" | "seeded-simulated";
  seededFallbackUsed: boolean;
  fallbackReason: string | null;
  diagnostics: string[];
  checkedAt: string;
}

export type DemoLivePreflightState = "ready" | "blocked" | "error" | "skipped";

export interface DemoLivePreflightCheck {
  id:
    | "runtime_model_readiness"
    | "auth0_session_readiness"
    | "connected_account_bootstrap"
    | "delegated_google_access"
    | "calendar_provider_readiness"
    | "gmail_draft_readiness"
    | "gmail_send_readiness";
  label: string;
  state: DemoLivePreflightState;
  headline: string;
  detail: string;
  diagnostics?: string[];
}

export interface DemoLivePreflightSnapshot {
  mode: DemoLivePreflightMode;
  checkedAt: string;
  overallState: "ready" | "blocked" | "error";
  summary: string;
  checks: DemoLivePreflightCheck[];
  fatalError: {
    code: string;
    message: string;
  } | null;
}

export interface DemoScenario {
  id: string;
  title: string;
  taskPrompt: string;
  referenceTime: string;
  targetDate: string;
  timezone: string;
  rootWarrantId: string;
  user: DemoUser;
  agents: DemoAgent[];
  warrants: WarrantContract[];
  actionAttempts: DemoActionAttempt[];
  approvals: DemoApprovalRequest[];
  revocations: RevocationRecord[];
  timeline: LedgerEvent[];
  controlDecisions: RuntimeProposalControlDecision[];
  runtimeEvents: RuntimeControlEvent[];
  runtimeExecution: DemoRuntimeExecutionSnapshot;
  examples: DemoScenarioExamples;
}
