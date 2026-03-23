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
