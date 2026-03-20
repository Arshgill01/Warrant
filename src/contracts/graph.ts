import type { AgentStatus } from "@/contracts/agent";

export interface DelegationNode {
  warrantId: string;
  agentId: string;
  parentWarrantId: string | null;
  status: AgentStatus;
  capabilitySummary: string[];
}
