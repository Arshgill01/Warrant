import type {
  ActionKind,
  ActionTarget,
  ActionUsageSnapshot,
  ActionAuthorizationSnapshot,
  ProviderActionState,
} from "@/contracts/action";
import type { ApprovalStatus } from "@/contracts/approval";
import type { WarrantDecisionCode } from "@/contracts/policy";

export const RUNTIME_CONTROL_STATE_SET = [
  "proposal_created",
  "denied_policy",
  "approval_required",
  "approval_pending",
  "approval_approved",
  "approval_denied",
  "executable",
  "execution_failed",
  "blocked_revoked",
  "blocked_expired",
  "provider_unavailable",
] as const;

export type RuntimeControlState = (typeof RUNTIME_CONTROL_STATE_SET)[number];

export interface ActionProposal {
  id: string;
  actionId: string;
  requestedAt: string;
  kind: ActionKind;
  agentId: string;
  warrantId: string;
  target?: ActionTarget;
  usage?: ActionUsageSnapshot;
  summary: string;
  resource: string;
}

export interface ProposalControlDecision {
  proposalId: string;
  actionId: string;
  at: string;
  agentId: string;
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

export interface RuntimeEvent {
  id: string;
  at: string;
  proposalId: string;
  actionId: string;
  agentId: string;
  warrantId: string;
  parentWarrantId: string | null;
  controlState: RuntimeControlState;
  title: string;
  detail: string;
}
