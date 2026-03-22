import type { ActionAttempt, ActionKind } from "@/contracts/action";
import type {
  EffectiveWarrantStatus,
  PolicyReason,
  WarrantDecisionCode,
} from "@/contracts/policy";
import type {
  WarrantContract,
  WarrantLineage,
  WarrantResourceConstraints,
} from "@/contracts/warrant";

export type {
  EffectiveWarrantStatus,
  PolicyReason,
  WarrantDecisionCode,
} from "@/contracts/policy";

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
