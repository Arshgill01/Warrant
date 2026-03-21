export type ActionKind =
  | "calendar.read"
  | "calendar.schedule"
  | "gmail.draft"
  | "gmail.send"
  | "warrant.issue"
  | "warrant.revoke";

export type ActionGate = "policy" | "auth0" | "approval";

export type ActionPathState = "ready" | "blocked" | "pending";

export interface ActionAttempt {
  id: string;
  kind: ActionKind;
  agentId: string;
  warrantId: string;
  outcome: "allowed" | "blocked" | "approval-required";
}

export interface LocalPolicyCheck {
  allowed: boolean;
  reason: string;
}

export interface ActionPathSnapshot {
  kind: ActionKind;
  label: string;
  state: ActionPathState;
  gate: ActionGate;
  headline: string;
  detail: string;
  nextStep: string | null;
}
