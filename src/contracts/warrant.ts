import type { ActionKind } from "@/contracts/action";

export type WarrantStatus = "draft" | "active" | "revoked" | "expired";

export interface WarrantResourceConstraints {
  allowedRecipients?: string[];
  allowedDomains?: string[];
  maxSends?: number;
  calendarWindow?: string;
  allowedFolderIds?: string[];
}

export interface WarrantContract {
  id: string;
  parentId: string | null;
  agentId: string;
  purpose: string;
  capabilities: ActionKind[];
  resourceConstraints: WarrantResourceConstraints;
  canDelegate: boolean;
  maxChildren: number;
  expiresAt: string;
  status: WarrantStatus;
}
