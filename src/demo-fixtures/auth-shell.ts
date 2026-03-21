import type {
  ApprovalStatus,
  CalendarAvailabilityReadInput,
  ExternalActionExecutionRelease,
  GmailDraftInput,
  GmailSendInput,
  LocalPolicyCheck,
} from "@/contracts";

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

export const authShellProviderRequests: {
  calendarAvailability: CalendarAvailabilityReadInput;
  gmailDraft: GmailDraftInput;
  gmailSend: GmailSendInput;
} = {
  calendarAvailability: {
    calendarId: "primary",
    startsAt: "2026-04-18T08:00:00.000Z",
    endsAt: "2026-04-18T18:00:00.000Z",
    timeZone: "America/Los_Angeles",
    maxResults: 12,
  },
  gmailDraft: {
    to: ["founders@northstar.vc"],
    cc: ["ops@warrant-demo.dev"],
    subject: "Draft investor follow-up for tomorrow",
    bodyText:
      "Prepared outline for tomorrow's investor update:\n- runway and hiring snapshot\n- customer expansion highlights\n- follow-up asks and owners",
    threadId: null,
  },
  gmailSend: {
    to: ["founders@northstar.vc"],
    cc: ["ops@warrant-demo.dev"],
    subject: "Investor follow-up for tomorrow",
    bodyText:
      "Sending the investor follow-up requires an explicit release from the approval layer. This request keeps the provider execution boundary separate from draft preparation.",
    threadId: null,
  },
};

export const authShellSendReleasePreview: ExternalActionExecutionRelease = {
  execute: true,
  releasedBy: "demo",
  reason: "Used only in tests to prove the send boundary has a distinct execution path.",
};
