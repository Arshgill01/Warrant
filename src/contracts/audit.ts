export type LedgerEventKind =
  | "scenario.loaded"
  | "warrant.issued"
  | "action.allowed"
  | "action.blocked"
  | "approval.requested"
  | "approval.approved"
  | "approval.denied"
  | "warrant.revoked";

export type LedgerActorKind = "user" | "agent" | "system";

export interface RevocationRecord {
  id: string;
  warrantId: string;
  parentWarrantId: string | null;
  revokedByKind: LedgerActorKind;
  revokedById: string;
  revokedAt: string;
  reason: string;
  cascadedWarrantIds: string[];
}

export interface LedgerEvent {
  id: string;
  at: string;
  kind: LedgerEventKind;
  actorKind: LedgerActorKind;
  actorId: string;
  warrantId: string | null;
  parentWarrantId: string | null;
  actionId: string | null;
  approvalId: string | null;
  revocationId: string | null;
  title: string;
  description: string;
}
