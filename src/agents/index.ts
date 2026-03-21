import type { WorktreeBoundary } from "@/contracts";

export const agentsBoundary: WorktreeBoundary = {
  key: "agents",
  label: "Agents",
  path: "src/agents",
  purpose: "Own planner and child-agent orchestration, task routing, and warrant-aware execution flow.",
  futureWorktree: "Planner, Calendar Agent, and Comms Agent",
  notes: "Keep the orchestration deterministic, scenario-specific, and grounded in real warrant issuance.",
  status: "reserved",
};

export * from "@/agents/main-scenario";
export * from "@/agents/types";
