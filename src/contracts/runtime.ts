import type {
  ActionAuthorizationSnapshot,
  ActionKind,
  ActionProposalState,
  ActionTarget,
  ActionUsageSnapshot,
  ProviderActionState,
} from "@/contracts/action";
import type { ApprovalStatus } from "@/contracts/approval";
import type { AgentRole, AgentRuntimeState } from "@/contracts/agent";
import type { CanonicalControlState } from "@/contracts/control-state";
import type { WarrantDecisionCode } from "@/contracts/policy";

export interface PlannerPlanTask {
  id: string;
  role: AgentRole;
  title: string;
  summary: string;
  requiredCapabilities: ActionKind[];
  desiredOutcome: string;
}

export interface PlannerPlan {
  id: string;
  rootRequestId: string;
  plannerRuntimeId: string;
  plannerAgentId: string;
  warrantId: string;
  parentWarrantId: string | null;
  createdAt: string;
  tasks: PlannerPlanTask[];
  rationale: string;
}

export const PLANNER_PLAN_VALIDATION_STATUS_SET = [
  "valid",
  "schema_invalid",
  "semantically_invalid",
] as const;

export type PlannerPlanValidationStatus =
  (typeof PLANNER_PLAN_VALIDATION_STATUS_SET)[number];

export const PLANNER_PLAN_VALIDATION_CODE_SET = [
  "schema_required_field_missing",
  "schema_invalid_type",
  "schema_invalid_enum",
  "unknown_role",
  "capability_incompatible_with_parent_warrant",
  "missing_required_child_role",
  "unusable_task_decomposition",
] as const;

export type PlannerPlanValidationCode =
  (typeof PLANNER_PLAN_VALIDATION_CODE_SET)[number];

export interface PlannerPlanValidationIssue {
  code: PlannerPlanValidationCode;
  message: string;
  taskId: string | null;
  path: string[];
}

export interface PlannerPlanValidationResult {
  status: PlannerPlanValidationStatus;
  valid: boolean;
  issues: PlannerPlanValidationIssue[];
}

export interface PlannerRoleOutput {
  kind: "planner.plan";
  plan: PlannerPlan;
}

export interface CalendarRoleOutput {
  kind: "calendar.availability";
  windowStartsAt: string;
  windowEndsAt: string;
  summary: string;
}

export interface CommsRoleOutput {
  kind: "comms.message";
  recipients: string[];
  subject: string;
  preview: string;
  requiresApproval: boolean;
}

export type AgentRoleOutput =
  | PlannerRoleOutput
  | CalendarRoleOutput
  | CommsRoleOutput;

export const RUNTIME_EVENT_TYPE_SET = [
  "agent_started",
  "agent_completed",
  "agent_failed",
  "planner_plan_created",
  "planner_plan_invalid",
  "proposal_created",
  "proposal_denied",
  "approval_required",
  "approval_resolved",
  "execution_completed",
  "execution_failed",
  "branch_revoked",
] as const;

export type RuntimeEventType = (typeof RUNTIME_EVENT_TYPE_SET)[number];

interface RuntimeEventBase<Type extends RuntimeEventType> {
  id: string;
  at: string;
  type: Type;
  rootRequestId: string;
  runtimeId: string;
  agentId: string;
  agentRole: AgentRole;
  warrantId: string;
  parentWarrantId: string | null;
  proposalId: string | null;
  actionId: string | null;
  approvalId: string | null;
  revocationId: string | null;
}

export interface RuntimeEventPayloadMap {
  agent_started: { state: Extract<AgentRuntimeState, "starting" | "running">; message: string };
  agent_completed: { state: Extract<AgentRuntimeState, "completed">; message: string };
  agent_failed: { state: Extract<AgentRuntimeState, "failed">; errorCode: string; message: string };
  planner_plan_created: { planId: string; taskCount: number };
  planner_plan_invalid: {
    status: Exclude<PlannerPlanValidationStatus, "valid">;
    issueCodes: PlannerPlanValidationCode[];
    message: string;
  };
  proposal_created: { proposalId: string; proposalState: ActionProposalState };
  proposal_denied: { proposalId: string; code: string; message: string };
  approval_required: { proposalId: string; approvalId: string; reason: string };
  approval_resolved: {
    proposalId: string;
    approvalId: string;
    resolved: "approved" | "denied" | "expired";
    message: string;
  };
  execution_completed: { proposalId: string; actionId: string; message: string };
  execution_failed: {
    proposalId: string;
    actionId: string | null;
    errorCode: string;
    message: string;
  };
  branch_revoked: { revocationId: string; cascadedRuntimeIds: string[]; reason: string };
}

export type RuntimeEvent<Type extends RuntimeEventType = RuntimeEventType> =
  RuntimeEventBase<Type> & {
    payload: RuntimeEventPayloadMap[Type];
  };

export type AgentStepResultStatus =
  | "completed"
  | "blocked"
  | "awaiting_approval"
  | "failed";

export const AGENT_STEP_ERROR_CODE_SET = [
  "policy_denied",
  "approval_denied",
  "approval_expired",
  "provider_failure",
  "runtime_failure",
  "plan_schema_invalid",
  "plan_semantically_invalid",
  "branch_revoked",
] as const;

export type AgentStepErrorCode = (typeof AGENT_STEP_ERROR_CODE_SET)[number];

export interface AgentStepError {
  code: AgentStepErrorCode;
  message: string;
  details: string;
  retryable: boolean;
}

export interface AgentStepResult {
  id: string;
  rootRequestId: string;
  runtimeId: string;
  agentId: string;
  agentRole: AgentRole;
  warrantId: string;
  parentWarrantId: string | null;
  proposalId: string | null;
  actionId: string | null;
  status: AgentStepResultStatus;
  controlState: CanonicalControlState;
  completedAt: string;
  output: AgentRoleOutput | null;
  error: AgentStepError | null;
}

export interface ModelAdapterRequest {
  actorRole: "planner";
  actorId: string;
  objective: string;
  schemaName: string;
  schemaDescription: string;
  instructions: string;
  repairContext: string | null;
  attempt: number;
}

export interface SharedModelAdapter {
  name: string;
  invokeStructured(request: ModelAdapterRequest): unknown;
}

export const RUNTIME_CONTROL_STATE_SET = [
  "proposal_created",
  "denied_policy",
  "approval_required",
  "approval_pending",
  "approval_approved",
  "approval_denied",
  "executable",
  "executed",
  "execution_failed",
  "blocked_revoked",
  "blocked_expired",
  "provider_unavailable",
] as const;

export type RuntimeControlState = (typeof RUNTIME_CONTROL_STATE_SET)[number];

export interface RuntimeActionProposal {
  id: string;
  actionId: string;
  requestedAt: string;
  kind: ActionKind;
  agentId: string;
  runtimeActorId?: string | null;
  warrantId: string;
  target?: ActionTarget;
  usage?: ActionUsageSnapshot;
  summary: string;
  resource: string;
}

export interface RuntimeProposalControlDecision {
  proposalId: string;
  actionId: string;
  at: string;
  agentId: string;
  runtimeActorId: string | null;
  warrantId: string;
  parentWarrantId: string | null;
  controlState: RuntimeControlState;
  allowedToExecute: boolean;
  reason: string;
  policyCode: WarrantDecisionCode | null;
  authorization: ActionAuthorizationSnapshot | null;
  approvalStatus: ApprovalStatus | null;
  providerState: ProviderActionState | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface RuntimeControlEvent {
  id: string;
  at: string;
  proposalId: string;
  actionId: string;
  agentId: string;
  runtimeActorId: string | null;
  warrantId: string;
  parentWarrantId: string | null;
  controlState: RuntimeControlState;
  title: string;
  detail: string;
}
