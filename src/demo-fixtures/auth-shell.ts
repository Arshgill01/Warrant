import type { ApprovalStatus, LocalPolicyCheck } from "@/contracts";

export const authShellPolicies: Record<"calendarRead" | "gmailDraft" | "gmailSend", LocalPolicyCheck> = {
  calendarRead: {
    allowed: true,
    reason: "This shell assumes the Calendar agent may inspect availability once the warrant layer is in place.",
  },
  gmailDraft: {
    allowed: true,
    reason: "This shell assumes the Comms agent may prepare draft copy once local policy authorizes drafting.",
  },
  gmailSend: {
    allowed: true,
    reason: "This shell keeps send conceptually allowed by local policy so the approval gate remains visible.",
  },
};

export const authShellSendApprovalStatus: ApprovalStatus = "pending";
