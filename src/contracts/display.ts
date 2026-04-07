import type {
  ActionAuthorizationSnapshot,
  ActionAttemptOutcome,
  ActionKind,
  ProviderActionState,
} from "@/contracts/action";
import type { AgentRole } from "@/contracts/agent";
import type {
  ApprovalRequestPreview,
  ApprovalStatus,
} from "@/contracts/approval";
import type { LedgerActorKind, LedgerEventKind } from "@/contracts/audit";
import type { CanonicalControlState, DisplayStatus } from "@/contracts/control-state";

export type DisplayStatusSource =
  | "agent"
  | "approval"
  | "action"
  | "provider"
  | "warrant";

export interface DisplayField {
  label: string;
  value: string;
}

export interface DelegationGraphNodeRecord {
  id: string;
  agentId: string;
  runtimeActorId: string;
  runtimeActorLabel: string;
  parentId: string | null;
  label: string;
  role: AgentRole;
  status: DisplayStatus;
  statusReason: string;
  statusSource: DisplayStatusSource;
  runtimeStatus: CanonicalControlState | null;
  runtimeStatusReason: string | null;
  purpose: string;
  capabilityBadges: string[];
  canDelegate: boolean;
  expiresAt: string;
}

export interface DelegationGraphEdgeRecord {
  id: string;
  sourceId: string;
  targetId: string;
  status: DisplayStatus;
}

export type GraphNodeDTO = DelegationGraphNodeRecord;
export type GraphEdgeDTO = DelegationGraphEdgeRecord;
export interface ActionAttemptDisplayRecord {
  id: string;
  proposalId: string | null;
  runtimeActorId: string;
  kind: ActionKind;
  agentId: string;
  agentLabel: string;
  rootRequestId: string;
  warrantId: string;
  parentWarrantId: string | null;
  requestedAt: string;
  summary: string;
  resource: string;
  outcome: ActionAttemptOutcome;
  controlState: CanonicalControlState;
  runtimeControlState: CanonicalControlState | null;
  runtimeControlReason: string | null;
  outcomeReason: string;
  authorization: ActionAuthorizationSnapshot;
  approvalRequestId: string | null;
  providerState: ProviderActionState | null;
  providerHeadline: string | null;
  providerDetail: string | null;
}

export interface ApprovalStateDisplayRecord {
  id: string;
  actionId: string;
  warrantId: string;
  requestedByAgentId: string;
  requestedByLabel: string;
  status: ApprovalStatus;
  controlState: CanonicalControlState;
  title: string;
  reason: string;
  preview: ApprovalRequestPreview;
  requestedAt: string;
  expiresAt: string;
  decidedAt: string | null;
  affectedRecipients: string[];
  blastRadius: string;
  provider: "auth0";
}

export interface WarrantDisplaySummary {
  id: string;
  parentId: string | null;
  parentLabel: string | null;
  rootRequestId: string;
  agentId: string;
  agentLabel: string;
  agentRole: AgentRole;
  status: DisplayStatus;
  statusReason: string;
  statusSource: DisplayStatusSource;
  runtimeActorId: string;
  runtimeActorLabel: string;
  latestRuntimeProposalId: string | null;
  latestRuntimeControlState: CanonicalControlState | null;
  latestRuntimeControlReason: string | null;
  latestRuntimeControlAt: string | null;
  latestRuntimeEventTitle: string | null;
  latestRuntimeEventDetail: string | null;
  purpose: string;
  capabilities: string[];
  constraints: DisplayField[];
  createdAt: string;
  expiresAt: string;
  canDelegate: boolean;
  maxChildren: number;
  revokedAt: string | null;
  revocationReason: string | null;
  latestAction: ActionAttemptDisplayRecord | null;
  latestPolicyDenial: ActionAttemptDisplayRecord | null;
  latestApproval: ApprovalStateDisplayRecord | null;
  pendingApproval: ApprovalStateDisplayRecord | null;
}

export type TimelineEventTone =
  | "info"
  | CanonicalControlState;

export interface TimelineEventDisplayRecord {
  id: string;
  at: string;
  kind: LedgerEventKind;
  controlState: CanonicalControlState;
  kindLabel: string;
  resultLabel: string;
  resultTone: TimelineEventTone;
  actorKind: LedgerActorKind;
  actorId: string;
  actorLabel: string;
  runtimeActorId: string | null;
  runtimeActorLabel: string | null;
  warrantId: string | null;
  warrantLabel: string | null;
  parentWarrantId: string | null;
  parentWarrantLabel: string | null;
  actionId: string | null;
  approvalId: string | null;
  revocationId: string | null;
  branchLabel: string;
  lineagePath: string[];
  title: string;
  description: string;
  proposalId: string | null;
  runtimeEventId: string | null;
  runtimeTitle: string | null;
  runtimeDetail: string | null;
  runtimeControlState: CanonicalControlState | null;
}

export interface DelegationGraphDTO {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
  warrantSummaries: WarrantDisplaySummary[];
}

export interface DisplayScenarioExampleSet {
  calendarChildWarrant: WarrantDisplaySummary;
  commsChildWarrant: WarrantDisplaySummary;
  calendarAction: ActionAttemptDisplayRecord;
  commsDraftAction: ActionAttemptDisplayRecord;
  commsOverreachAction: ActionAttemptDisplayRecord;
  commsSendAction: ActionAttemptDisplayRecord;
  commsSendApproval: ApprovalStateDisplayRecord;
}
