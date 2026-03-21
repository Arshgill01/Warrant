import type { ActionKind, AgentRole, DemoScenario } from "@/contracts";

export type PlannerTaskStatus = "delegated" | "completed";

export interface PlannerTaskRecord {
  id: string;
  title: string;
  summary: string;
  assignedAgentId: string;
  assignedRole: AgentRole;
  requiredCapabilities: ActionKind[];
  warrantId: string;
  status: PlannerTaskStatus;
}

export interface MainScenarioRunResult {
  scenario: DemoScenario;
  taskPlan: PlannerTaskRecord[];
}
