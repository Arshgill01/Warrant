import type { WorktreeBoundary } from "@/contracts";

export const actionsBoundary: WorktreeBoundary = {
  key: "actions",
  label: "Actions",
  path: "src/actions",
  purpose: "Own concrete action adapters and the local-vs-external capability gate for execution attempts.",
  futureWorktree: "Action execution and enforcement boundary",
  notes: "This should become the visible proof point that local warrants and external delegated access both matter.",
  status: "placeholder",
};
