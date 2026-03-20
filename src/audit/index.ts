import type { WorktreeBoundary } from "@/contracts";

export const auditBoundary: WorktreeBoundary = {
  key: "audit",
  label: "Audit",
  path: "src/audit",
  purpose: "Own lineage-aware event records, denial reasons, receipts, and human-readable audit artifacts.",
  futureWorktree: "Audit log and receipts",
  notes: "Every meaningful action should eventually be attributable through this boundary.",
  status: "reserved",
};
