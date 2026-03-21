import type { WarrantDecisionCode } from "@/warrants/types";

interface ReasonContext {
  actionKind?: string;
  blockedByWarrantId?: string | null;
  capability?: string;
  folderId?: string;
  maxChildren?: number;
  maxUsage?: number;
  recipient?: string;
  revocationSourceId?: string | null;
  timestamp?: string;
}

export function createReason(
  code: Exclude<WarrantDecisionCode, "allowed">,
  context: ReasonContext = {},
): { code: Exclude<WarrantDecisionCode, "allowed">; message: string } {
  switch (code) {
    case "agent_not_holder":
      return {
        code,
        message: "This warrant belongs to a different agent.",
      };
    case "warrant_mismatch":
      return {
        code,
        message: "This action is not using the warrant it claims to use.",
      };
    case "warrant_revoked":
      return {
        code,
        message:
          "This warrant has been revoked and can no longer authorize actions.",
      };
    case "warrant_expired":
      return {
        code,
        message: `This warrant expired${context.timestamp ? ` at ${context.timestamp}` : ""}.`,
      };
    case "ancestor_revoked":
      return {
        code,
        message: `This warrant lost authority because parent warrant ${context.blockedByWarrantId ?? context.revocationSourceId ?? "unknown"} was revoked.`,
      };
    case "ancestor_expired":
      return {
        code,
        message: `This warrant lost authority because parent warrant ${context.blockedByWarrantId ?? "unknown"} expired.`,
      };
    case "capability_missing":
      return {
        code,
        message: `This warrant does not allow ${context.capability ?? context.actionKind ?? "that action"}.`,
      };
    case "recipients_required":
      return {
        code,
        message:
          "This action must declare recipients before the warrant can authorize it.",
      };
    case "recipient_not_allowed":
      return {
        code,
        message: `This agent may only email approved recipients. ${context.recipient ?? "The requested recipient"} is outside its warrant.`,
      };
    case "domain_not_allowed":
      return {
        code,
        message:
          "This agent may only contact recipients in approved email domains.",
      };
    case "scheduled_time_required":
      return {
        code,
        message:
          "This calendar action must include a scheduled time before it can be authorized.",
      };
    case "calendar_window_exceeded":
      return {
        code,
        message:
          "This calendar action falls outside the warrant's allowed time window.",
      };
    case "folder_required":
      return {
        code,
        message:
          "This document action must include a folder before it can be authorized.",
      };
    case "folder_not_allowed":
      return {
        code,
        message: `This warrant may only access approved folders. ${context.folderId ?? "That folder"} is not allowed.`,
      };
    case "usage_limit_exceeded":
      return {
        code,
        message: `This warrant has reached its ${context.actionKind ?? "action"} limit of ${context.maxUsage ?? 0}.`,
      };
    case "delegation_not_allowed":
      return {
        code,
        message:
          "This warrant cannot delegate authority to a child warrant.",
      };
    case "max_children_exceeded":
      return {
        code,
        message: `This warrant cannot issue more than ${context.maxChildren ?? 0} child warrants.`,
      };
    case "child_capability_exceeds_parent":
      return {
        code,
        message:
          "A child warrant cannot gain capabilities that its parent does not have.",
      };
    case "child_expiry_exceeds_parent":
      return {
        code,
        message: "A child warrant cannot outlive its parent warrant.",
      };
    case "child_can_delegate_exceeds_parent":
      return {
        code,
        message:
          "A child warrant cannot keep delegation rights that its parent does not allow.",
      };
    case "child_max_children_exceeds_parent":
      return {
        code,
        message:
          "A child warrant cannot allow more descendants than its parent warrant.",
      };
    case "child_recipients_exceed_parent":
      return {
        code,
        message:
          "A child warrant cannot broaden the parent's approved email recipients.",
      };
    case "child_domains_exceed_parent":
      return {
        code,
        message:
          "A child warrant cannot broaden the parent's approved email domains.",
      };
    case "child_send_limit_exceeds_parent":
      return {
        code,
        message:
          "A child warrant cannot allow more email sends than its parent warrant.",
      };
    case "child_draft_limit_exceeds_parent":
      return {
        code,
        message:
          "A child warrant cannot allow more drafts than its parent warrant.",
      };
    case "child_calendar_window_exceeds_parent":
      return {
        code,
        message:
          "A child warrant cannot expand the parent's calendar time window.",
      };
    case "child_folder_access_exceeds_parent":
      return {
        code,
        message:
          "A child warrant cannot access folders outside the parent's approved set.",
      };
    default:
      return {
        code,
        message: "This action is not allowed by the warrant policy.",
      };
  }
}
