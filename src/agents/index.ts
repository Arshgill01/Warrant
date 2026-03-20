import type { WorktreeBoundary } from "@/contracts";

export const agentsBoundary: WorktreeBoundary = {
  key: "agents",
  label: "Agents",
  path: "src/agents",
  purpose: "Own planner and child-agent orchestration, task routing, and warrant-aware execution flow.",
  futureWorktree: "Planner, Calendar Agent, and Comms Agent",
  notes: "Do not generalize beyond the demo path until the core agent tree works.",
  status: "reserved",
};
