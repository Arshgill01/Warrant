import type { WorktreeBoundary } from "@/contracts";

export const graphBoundary: WorktreeBoundary = {
  key: "graph",
  label: "Delegation Graph UI",
  path: "src/graph",
  purpose: "Own the visual representation of the delegation tree, node cards, and branch status.",
  futureWorktree: "Delegation graph UI",
  notes: "The most important visual artifact for the demo.",
  status: "reserved",
};

export * from "./delegation-graph";
