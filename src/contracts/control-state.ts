import type { ActionAttemptOutcome, ProviderActionState } from "@/contracts/action";
import type { ApprovalStatus } from "@/contracts/approval";
import type { LedgerEventKind } from "@/contracts/audit";
import type { WarrantDecisionCode } from "@/contracts/policy";
import type { WarrantStatus } from "@/contracts/warrant";

export const CANONICAL_CONTROL_STATE_SET = [
  "denied_policy",
  "approval_required",
  "approval_pending",
  "approval_approved",
  "approval_denied",
  "blocked_revoked",
  "blocked_expired",
  "provider_unavailable",
  "active",
  "revoked",
  "expired",
] as const;

export type CanonicalControlState = (typeof CANONICAL_CONTROL_STATE_SET)[number];
export type DisplayStatus = CanonicalControlState;

export const approvalStatusControlStateMap: Record<ApprovalStatus, CanonicalControlState> = {
  pending: "approval_pending",
  approved: "approval_approved",
  denied: "approval_denied",
  expired: "approval_denied",
};

export const warrantStatusControlStateMap: Record<WarrantStatus, CanonicalControlState> = {
  active: "active",
  revoked: "revoked",
  expired: "expired",
};

export const timelineKindControlStateMap: Record<LedgerEventKind, CanonicalControlState> = {
  "scenario.loaded": "active",
  "warrant.issued": "active",
  "action.allowed": "active",
  "action.blocked": "denied_policy",
  "approval.requested": "approval_pending",
  "approval.approved": "approval_approved",
  "approval.denied": "approval_denied",
  "warrant.revoked": "revoked",
};

export function isRevocationDecisionCode(code: WarrantDecisionCode): boolean {
  return code === "warrant_revoked" || code === "ancestor_revoked";
}

export function isExpiryDecisionCode(code: WarrantDecisionCode): boolean {
  return code === "warrant_expired" || code === "ancestor_expired";
}

export function mapActionOutcomeToControlState(input: {
  outcome: ActionAttemptOutcome;
  authorizationCode: WarrantDecisionCode;
  providerState?: ProviderActionState | null;
}): CanonicalControlState {
  if (
    input.providerState === "disconnected" ||
    input.providerState === "unavailable" ||
    input.providerState === "failed" ||
    input.providerState === "execution-blocked"
  ) {
    return "provider_unavailable";
  }

  if (input.outcome === "allowed") {
    return "active";
  }

  if (input.outcome === "approval-required") {
    return "approval_required";
  }

  if (isRevocationDecisionCode(input.authorizationCode)) {
    return "blocked_revoked";
  }

  if (isExpiryDecisionCode(input.authorizationCode)) {
    return "blocked_expired";
  }

  return "denied_policy";
}
