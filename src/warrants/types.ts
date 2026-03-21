import type { ActionAttempt, ActionKind } from "@/contracts/action";
import type {
  WarrantContract,
  WarrantLineage,
  WarrantResourceConstraints,
} from "@/contracts/warrant";

export type EffectiveWarrantStatus = "active" | "expired" | "revoked";

export type WarrantDecisionCode =
  | "allowed"
  | "agent_not_holder"
  | "warrant_mismatch"
  | "warrant_revoked"
  | "warrant_expired"
  | "ancestor_revoked"
  | "ancestor_expired"
  | "capability_missing"
  | "recipients_required"
  | "recipient_not_allowed"
  | "domain_not_allowed"
  | "scheduled_time_required"
  | "calendar_window_exceeded"
  | "folder_required"
  | "folder_not_allowed"
  | "usage_limit_exceeded"
  | "delegation_not_allowed"
  | "max_children_exceeded"
  | "child_capability_exceeds_parent"
  | "child_expiry_exceeds_parent"
  | "child_can_delegate_exceeds_parent"
  | "child_max_children_exceeds_parent"
  | "child_recipients_exceed_parent"
  | "child_domains_exceed_parent"
  | "child_send_limit_exceeds_parent"
  | "child_draft_limit_exceeds_parent"
  | "child_calendar_window_exceeds_parent"
  | "child_folder_access_exceeds_parent";

export interface PolicyReason {
  code: Exclude<WarrantDecisionCode, "allowed">;
  message: string;
}

export interface BaseWarrantInput {
  id: string;
  createdBy: string;
  agentId: string;
  purpose: string;
  capabilities: ActionKind[];
  resourceConstraints?: WarrantResourceConstraints;
  canDelegate: boolean;
  maxChildren: number;
  expiresAt: string;
}

export interface IssueRootWarrantInput extends BaseWarrantInput {
  rootRequestId: string;
  createdAt: string;
}

export type ChildWarrantInput = BaseWarrantInput;

export interface ValidateChildWarrantInput {
  parent: WarrantContract;
  child: ChildWarrantInput;
  existingChildrenCount?: number;
  now: string;
}

export interface ChildWarrantValidationResult {
  valid: boolean;
  reasons: PolicyReason[];
}

export type IssueChildWarrantResult =
  | {
      ok: true;
      warrant: WarrantContract;
    }
  | {
      ok: false;
      reason: PolicyReason;
      reasons: PolicyReason[];
    };

export interface EffectiveWarrantEvaluation {
  status: EffectiveWarrantStatus;
  blockedByWarrantId: string | null;
  reason: PolicyReason | null;
}

export interface AuthorizationEventMetadata {
  eventId: string;
  occurredAt: string;
  actionId: string;
  actionKind: ActionKind;
  outcome: "allowed" | "denied";
  decisionCode: WarrantDecisionCode;
  message: string;
}

export interface AuthorizationDecisionBase {
  warrantId: string;
  lineage: WarrantLineage;
  effectiveStatus: EffectiveWarrantStatus;
  metadata: AuthorizationEventMetadata;
}

export interface AllowedAuthorizationResult extends AuthorizationDecisionBase {
  allowed: true;
  code: "allowed";
  message: string;
}

export interface DeniedAuthorizationResult extends AuthorizationDecisionBase {
  allowed: false;
  code: Exclude<WarrantDecisionCode, "allowed">;
  message: string;
  reason: PolicyReason;
  blockedByWarrantId: string | null;
}

export type AuthorizationResult =
  | AllowedAuthorizationResult
  | DeniedAuthorizationResult;

export interface AuthorizeActionInput {
  warrant: WarrantContract;
  warrants: readonly WarrantContract[];
  action: ActionAttempt;
  now: string;
}

export interface WarrantRevocationEvent {
  warrantId: string;
  lineage: WarrantLineage;
  metadata: {
    eventId: string;
    occurredAt: string;
    type: "warrant.revoked";
    reason: string;
    inherited: boolean;
    revokedBy: string;
    revocationSourceId: string;
  };
}

export interface RevokeWarrantBranchInput {
  warrants: readonly WarrantContract[];
  warrantId: string;
  revokedAt: string;
  revokedBy: string;
  reason: string;
}

export interface RevokeWarrantBranchResult {
  warrants: WarrantContract[];
  revokedWarrantIds: string[];
  events: WarrantRevocationEvent[];
}
