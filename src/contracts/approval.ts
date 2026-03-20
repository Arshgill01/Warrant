export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export interface ApprovalRequest {
  id: string;
  actionId: string;
  requestedByAgentId: string;
  reason: string;
  status: ApprovalStatus;
}
