export type ActionKind =
  | "calendar.read"
  | "calendar.schedule"
  | "docs.read"
  | "gmail.draft"
  | "gmail.send"
  | "warrant.issue"
  | "warrant.revoke";

export interface ActionTarget {
  recipients?: string[];
  scheduledFor?: string;
  folderId?: string;
}

export interface ActionUsageSnapshot {
  draftsUsed?: number;
  sendsUsed?: number;
}

export type ActionGate = "policy" | "auth0" | "approval";

export type ActionPathState = "ready" | "blocked" | "pending";

export type ActionAttemptOutcome = "allowed" | "blocked" | "approval-required";

export interface ActionAttempt {
  id: string;
  kind: ActionKind;
  agentId: string;
  warrantId: string;
  requestedAt: string;
  target?: ActionTarget;
  usage?: ActionUsageSnapshot;
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
