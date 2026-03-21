export type ActionKind =
  | "calendar.read"
  | "calendar.schedule"
  | "gmail.draft"
  | "gmail.send"
  | "docs.read"
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

export interface ActionAttempt {
  id: string;
  kind: ActionKind;
  agentId: string;
  warrantId: string;
  requestedAt: string;
  target?: ActionTarget;
  usage?: ActionUsageSnapshot;
}
