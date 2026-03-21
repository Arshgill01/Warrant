import type { WorktreeBoundary } from "@/contracts";

export const actionsBoundary: WorktreeBoundary = {
  key: "actions",
  label: "Actions",
  path: "src/actions",
  purpose: "Own concrete action adapters and the local-vs-external capability gate for execution attempts.",
  futureWorktree: "Action execution and enforcement boundary",
  notes: "This now owns deterministic provider adapters, warrant-aware execution, and the visible proof point that local warrants and external delegated access both matter.",
  status: "shared",
};

export * from "@/actions/execution";
export * from "@/actions/google";
export * from "@/actions/provider-adapters";
