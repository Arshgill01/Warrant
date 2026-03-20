export type AgentRole = "planner" | "calendar" | "comms" | "docs";

export type AgentStatus = "idle" | "active" | "blocked" | "revoked";

export interface AgentIdentity {
  id: string;
  role: AgentRole;
  label: string;
}
