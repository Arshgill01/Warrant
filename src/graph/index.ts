import type { WorktreeBoundary } from "@/contracts";

export const graphBoundary: WorktreeBoundary = {
  key: "graph",
  label: "Graph",
  path: "src/graph",
  purpose: "Own the delegation tree, node detail UI, status states, and branch revoke affordances.",
  futureWorktree: "Delegation graph UI",
  notes: "Optimize for fast comprehension of who can do what and why a branch is blocked or revoked.",
  status: "reserved",
};
