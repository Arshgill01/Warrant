import type { ActionAttempt } from "@/contracts/action";
import type { AgentIdentity, AgentStatus } from "@/contracts/agent";
import type { ApprovalRequest } from "@/contracts/approval";
import type { LedgerEvent, RevocationRecord } from "@/contracts/audit";
import type { WarrantContract } from "@/contracts/warrant";

export type ExternalSystem = "gmail" | "google-calendar" | "google-docs";
export type DemoActionOutcome = "allowed" | "blocked" | "approval-required";

export interface DemoUser {
  id: string;
  label: string;
  email: string;
  timezone: string;
}

export interface DemoAgent extends AgentIdentity {
  status: AgentStatus;
  purpose: string;
  summary: string;
  warrantId: string;
  parentAgentId: string | null;
  externalSystems: ExternalSystem[];
}

export interface DemoActionAttempt extends ActionAttempt {
  parentWarrantId: string | null;
  createdAt: string;
  summary: string;
  resource: string;
  outcome: DemoActionOutcome;
  outcomeReason: string;
  approvalRequestId?: string;
}

export interface DemoApprovalRequest extends ApprovalRequest {
  warrantId: string;
  title: string;
  preview: string;
  requestedAt: string;
  expiresAt: string;
  decidedAt: string | null;
  affectedRecipients: string[];
  blastRadius: string;
}

export interface DemoScenarioExamples {
  validChildActionId: string;
  blockedOverreachActionId: string;
  approvalPendingActionId: string;
  approvalPendingRequestId: string;
  revokedBranchActionId: string;
  revokedBranchRecordId: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  taskPrompt: string;
  referenceTime: string;
  targetDate: string;
  timezone: string;
  rootWarrantId: string;
  user: DemoUser;
  agents: DemoAgent[];
  warrants: WarrantContract[];
  actionAttempts: DemoActionAttempt[];
  approvals: DemoApprovalRequest[];
  revocations: RevocationRecord[];
  timeline: LedgerEvent[];
  examples: DemoScenarioExamples;
}
