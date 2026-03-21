export type ActionKind =
  | "calendar.read"
  | "calendar.schedule"
  | "docs.read"
  | "gmail.draft"
  | "gmail.send"
  | "warrant.issue"
  | "warrant.revoke";

export interface ActionAttempt {
  id: string;
  kind: ActionKind;
  agentId: string;
  warrantId: string;
  outcome: "allowed" | "blocked" | "approval-required";
}
