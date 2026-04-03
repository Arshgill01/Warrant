import type {
  ActionPathSnapshot,
  ExternalActionExecutionRelease,
} from "@/contracts/action";

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export type SendApprovalState =
  | "not-requested"
  | "pending"
  | "approved"
  | "denied"
  | "unavailable"
  | "error";

export interface ApprovalRequestPreview {
  actionKind: "gmail.send";
  subject: string;
  bodyText: string;
  to: string[];
  cc: string[];
  bcc: string[];
  draftId: string | null;
}

export interface ApprovalRequest {
  id: string;
  actionId: string;
  warrantId: string;
  requestedByAgentId: string;
  reason: string;
  status: ApprovalStatus;
  title: string;
  preview: ApprovalRequestPreview;
  requestedAt: string;
  expiresAt: string;
  decidedAt: string | null;
  affectedRecipients: string[];
  blastRadius: string;
  provider: "auth0";
}

export interface SendApprovalStateRecord {
  state: SendApprovalState;
  label: string;
  headline: string;
  detail: string;
  nextStep: string | null;
  executionReady: boolean;
  release: ExternalActionExecutionRelease | null;
}

export interface SendApprovalBoundarySummary {
  localEligibility: ActionPathSnapshot;
  approvalRequirement: ActionPathSnapshot;
  executionReadiness: ActionPathSnapshot;
  providerExecution: ActionPathSnapshot | null;
}
