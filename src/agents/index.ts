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
export * from "@/agents/runtime";
export * from "@/agents/model-adapter";
export * from "@/agents/planner-schema";
export * from "@/agents/planner-semantics";
export * from "@/agents/planner-runtime";
export * from "@/agents/runtime-control";
export * from "@/agents/types";
