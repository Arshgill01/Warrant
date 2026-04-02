import type {
  CalendarWindowConstraint,
  DemoUser,
  ProviderActionState,
} from "@/contracts";

interface DeterministicProviderAdapterMeta {
  providerState: ProviderActionState;
  providerHeadline: string;
  providerDetail: string;
}

export interface CalendarReadAdapterInput {
  user: DemoUser;
  targetDate: string;
  timezone: string;
  calendarWindow: CalendarWindowConstraint;
}

export interface CalendarReadAdapterOutput extends DeterministicProviderAdapterMeta {
  summary: string;
  resource: string;
  outcomeReason: string;
  timelineTitle: string;
  timelineDescription: string;
  busySlots: string[];
  recommendedFollowUpTime: string;
}

export interface CalendarReadAdapter {
  readAvailability(input: CalendarReadAdapterInput): CalendarReadAdapterOutput;
}

export interface GmailDraftAdapterInput {
  user: DemoUser;
  targetDate: string;
  recipients: string[];
}

export interface GmailDraftAdapterOutput extends DeterministicProviderAdapterMeta {
  summary: string;
  resource: string;
  outcomeReason: string;
  timelineTitle: string;
  timelineDescription: string;
  draftIds: string[];
  preview: string;
}

export interface GmailDraftAdapter {
  createFollowUpDrafts(input: GmailDraftAdapterInput): GmailDraftAdapterOutput;
}

export interface ScenarioActionAdapters {
  calendar: CalendarReadAdapter;
  comms: GmailDraftAdapter;
}

export function createDeterministicScenarioActionAdapters(): ScenarioActionAdapters {
  return {
    calendar: {
      readAvailability(input) {
        return {
          providerState: "success",
          providerHeadline:
            "Calendar Agent reached the delegated Google Calendar path successfully.",
          providerDetail:
            "The deterministic Wave 2 adapter simulates a successful Auth0-backed calendar read for the bounded scheduling window.",
          summary:
            "Reviewed tomorrow's availability before drafting the investor update.",
          resource: `Calendar window for ${input.targetDate}`,
          outcomeReason:
            "This child warrant allows one calendar read inside the April 18 scheduling window.",
          timelineTitle: "Calendar window reviewed",
          timelineDescription:
            "Calendar Agent reviews the bounded April 18 window and finds a clear 10:30 AM follow-up slot before the investor update goes out.",
          busySlots: ["2026-04-18T09:00:00.000Z/2026-04-18T10:00:00.000Z"],
          recommendedFollowUpTime: "2026-04-18T10:30:00.000Z",
        };
      },
    },
    comms: {
      createFollowUpDrafts(input) {
        return {
          providerState: "success",
          providerHeadline:
            "Comms Agent reached the delegated Gmail draft path successfully.",
          providerDetail:
            "The deterministic Wave 2 adapter simulates a successful Auth0-backed Gmail draft creation for the approved recipients.",
          summary:
            "Drafted investor follow-up emails for the approved internal recipients.",
          resource: `Drafts for ${input.recipients.join(" and ")}`,
          outcomeReason:
            "This child warrant allows drafting for approved recipients. It does not allow a real send without approval.",
          timelineTitle: "Follow-up drafts prepared",
          timelineDescription:
            "Comms Agent drafts follow-up emails for the approved Northstar recipients and stops before send so Maya can review the exact message.",
          draftIds: ["draft-investor-update-001", "draft-investor-update-002"],
          preview:
            "Subject: Investor update for tomorrow\n\nSharing the draft update and proposed follow-up timing before we send anything externally.",
        };
      },
    },
  };
}
