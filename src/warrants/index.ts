import type { WorktreeBoundary } from "@/contracts";

export const warrantsBoundary: WorktreeBoundary = {
  key: "warrants",
  label: "Warrants",
  path: "src/warrants",
  purpose: "Own issuance, narrowing, revocation, descendant invalidation, and policy enforcement rules.",
  futureWorktree: "Warrant engine",
  notes: "Keep the logic inspectable and tied to visible demo behavior.",
  status: "reserved",
};

export * from "@/warrants/authorization";
export * from "@/warrants/issuance";
export * from "@/warrants/revocation";
export * from "@/warrants/status";
export * from "@/warrants/types";
