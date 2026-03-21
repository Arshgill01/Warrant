import type { ActionKind } from "@/contracts/action";

export type WarrantStatus = "active" | "revoked" | "expired";

export interface CalendarWindowConstraint {
  startsAt: string;
  endsAt: string;
}

export interface WarrantResourceConstraints {
  allowedRecipients?: string[];
  allowedDomains?: string[];
  maxSends?: number;
  maxDrafts?: number;
  calendarWindow?: CalendarWindowConstraint;
  allowedFolderIds?: string[];
}

export interface WarrantLineage {
  rootRequestId: string;
  warrantId: string;
  parentWarrantId: string | null;
  agentId: string;
}

export interface WarrantContract {
  id: string;
  parentId: string | null;
  rootRequestId: string;
  createdBy: string;
  agentId: string;
  purpose: string;
  capabilities: ActionKind[];
  resourceConstraints: WarrantResourceConstraints;
  canDelegate: boolean;
  maxChildren: number;
  createdAt: string;
  expiresAt: string;
  status: WarrantStatus;
  revokedAt: string | null;
  revocationReason: string | null;
  revocationSourceId: string | null;
  revokedBy: string | null;
}
