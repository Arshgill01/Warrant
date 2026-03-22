import type {
  ActionAuthorizationSnapshot,
  ActionAttemptOutcome,
  ActionKind,
  ProviderActionState,
} from "@/contracts/action";
import type { AgentRole } from "@/contracts/agent";
import type { ApprovalStatus } from "@/contracts/approval";
import type { LedgerActorKind, LedgerEventKind } from "@/contracts/audit";

export type DisplayStatus =
  | "idle"
  | "active"
  | "blocked"
  | "pending-approval"
  | "revoked"
  | "expired"
  | "denied";

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
  parentId: string | null;
  label: string;
  role: AgentRole;
  status: DisplayStatus;
  statusReason: string;
  statusSource: DisplayStatusSource;
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
  title: string;
  reason: string;
  preview: string;
  requestedAt: string;
  expiresAt: string;
  decidedAt: string | null;
  affectedRecipients: string[];
  blastRadius: string;
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
  pendingApproval: ApprovalStateDisplayRecord | null;
}

export interface TimelineEventDisplayRecord {
  id: string;
  at: string;
  kind: LedgerEventKind;
  actorKind: LedgerActorKind;
  actorId: string;
  actorLabel: string;
  warrantId: string | null;
  parentWarrantId: string | null;
  actionId: string | null;
  approvalId: string | null;
  revocationId: string | null;
  title: string;
  description: string;
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
}
