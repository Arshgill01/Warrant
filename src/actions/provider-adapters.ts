import type { CalendarWindowConstraint, DemoUser } from "@/contracts";

export interface CalendarReadAdapterInput {
  user: DemoUser;
  targetDate: string;
  timezone: string;
  calendarWindow: CalendarWindowConstraint;
}

export interface CalendarReadAdapterOutput {
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

export interface GmailDraftAdapterOutput {
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
          summary:
            "Reviewed tomorrow's availability before drafting the investor update.",
          resource: `Calendar window for ${input.targetDate}`,
          outcomeReason:
            "The calendar child warrant allows one read inside the April 18 scheduling window.",
          timelineTitle: "Calendar context loaded",
          timelineDescription:
            "Calendar Agent reads the bounded April 18 window and finds a clean 10:30 AM follow-up slot before the investor update goes out.",
          busySlots: ["2026-04-18T09:00:00.000Z/2026-04-18T10:00:00.000Z"],
          recommendedFollowUpTime: "2026-04-18T10:30:00.000Z",
        };
      },
    },
    comms: {
      createFollowUpDrafts(input) {
        return {
          summary:
            "Drafted investor follow-up emails for the approved internal recipients.",
          resource: `Drafts for ${input.recipients.join(" and ")}`,
          outcomeReason:
            "The Comms child warrant allows drafting follow-ups immediately, while live sending remains gated behind a separate approval step.",
          timelineTitle: "Investor follow-up drafts created",
          timelineDescription:
            "Comms Agent drafts the follow-up emails for the approved Northstar recipients and stops before live send so the approval layer can review the exact message.",
          draftIds: ["draft-investor-update-001", "draft-investor-update-002"],
          preview:
            "Subject: Investor update for tomorrow\n\nSharing the draft update and proposed follow-up timing before we send anything externally.",
        };
      },
    },
  };
}
