export const AGENT_ROLE_SET = ["planner", "calendar", "comms"] as const;
export type AgentRole = (typeof AGENT_ROLE_SET)[number];

export const AGENT_RUNTIME_STATE_SET = [
  "starting",
  "running",
  "awaiting_input",
  "awaiting_approval",
  "blocked_policy",
  "blocked_revoked",
  "completed",
  "failed",
  "revoked",
] as const;

export type AgentRuntimeState = (typeof AGENT_RUNTIME_STATE_SET)[number];

export const AGENT_STATUS_SET = ["idle", "active", "blocked", "revoked"] as const;
export type AgentStatus = (typeof AGENT_STATUS_SET)[number];

export interface AgentIdentity {
  id: string;
  role: AgentRole;
  label: string;
}

export interface AgentRuntime {
  id: string;
  agentId: string;
  role: AgentRole;
  label: string;
  rootRequestId: string;
  warrantId: string;
  parentWarrantId: string | null;
  parentRuntimeId: string | null;
  startedAt: string;
  lastTransitionAt: string;
  state: AgentRuntimeState;
  stateReason: string;
}
