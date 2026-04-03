import type {
  ActionKind,
  AgentIdentity,
  AgentRole,
  DemoScenario,
  SharedModelAdapter,
  WarrantContract,
} from "@/contracts";

export type PlannerTaskStatus = "delegated" | "completed";
export type MainScenarioStage = "main" | "comms-revoked";

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

export type PlannerChildRole = "calendar" | "comms";
export type PlannerPlanSource = "model" | "fallback";

export interface PlannerDelegationDraft {
  childRole: PlannerChildRole;
  objective: string;
  requestedCapabilities: ActionKind[];
}

export interface PlannerStructuredPlan {
  goalInterpretation: string;
  delegationDrafts: PlannerDelegationDraft[];
}

export interface PlannerRuntimeIdentity extends AgentIdentity {
  role: "planner";
}

export interface PlannerRuntimeInput {
  rootRequestId: string;
  goal: string;
  now: string;
  parentWarrant: WarrantContract;
}

export interface PlannerRuntimeDeps {
  modelAdapter: SharedModelAdapter;
}

export type PlannerRuntimeEventKind =
  | "planner.started"
  | "planner.plan.valid"
  | "planner.output.invalid"
  | "planner.fallback.used"
  | "planner.failed";

export interface PlannerRuntimeEvent {
  id: string;
  at: string;
  kind: PlannerRuntimeEventKind;
  detail: string;
}

export interface PlannerRuntimeResult {
  identity: PlannerRuntimeIdentity;
  source: PlannerPlanSource;
  plan: PlannerStructuredPlan;
  events: PlannerRuntimeEvent[];
  attemptCount: number;
  usedRepair: boolean;
  failureReason: string | null;
}
