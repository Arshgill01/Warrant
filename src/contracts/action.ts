import type { ProviderConnectionSnapshot } from "@/contracts/connection";
import type {
  EffectiveWarrantStatus,
  WarrantDecisionCode,
} from "@/contracts/policy";

export type ActionKind =
  | "calendar.read"
  | "calendar.schedule"
  | "docs.read"
  | "gmail.draft"
  | "gmail.send"
  | "warrant.issue"
  | "warrant.revoke";

export interface ActionTarget {
  recipients?: string[];
  scheduledFor?: string;
  folderId?: string;
}

export interface ActionUsageSnapshot {
  draftsUsed?: number;
  sendsUsed?: number;
}

export type ProviderActionState =
  | "success"
  | "disconnected"
  | "unavailable"
  | "pending"
  | "failed"
  | "execution-blocked";

export type ProviderActionFailureCode =
  | "provider-disconnected"
  | "provider-pending"
  | "provider-expired"
  | "provider-unavailable"
  | "token-unavailable"
  | "execution-release-required"
  | "provider-request-failed"
  | "provider-response-invalid";

export type ActionGate = "policy" | "auth0" | "approval";

export type ActionPathState = "ready" | "blocked" | "pending";

export type ActionAttemptOutcome = "allowed" | "blocked" | "approval-required";

export const ACTION_PROPOSAL_STATE_SET = [
  "proposed",
  "policy_denied",
  "approval_required",
  "approval_pending",
  "approval_denied",
  "execution_ready",
  "executing",
  "execution_completed",
  "execution_failed",
  "revoked",
] as const;

export type ActionProposalState = (typeof ACTION_PROPOSAL_STATE_SET)[number];

export interface ActionProposal {
  id: string;
  rootRequestId: string;
  runtimeId: string;
  agentId: string;
  warrantId: string;
  parentWarrantId: string | null;
  kind: ActionKind;
  target?: ActionTarget;
  usage?: ActionUsageSnapshot;
  summary: string;
  rationale: string;
  createdAt: string;
  state: ActionProposalState;
  stateReason: string;
}

export const PROPOSAL_CONTROL_DECISION_SET = [
  "approved",
  "denied",
  "approval_required",
  "revoked",
] as const;

export type ProposalControlDecisionType = (typeof PROPOSAL_CONTROL_DECISION_SET)[number];

export type ProposalControlDecisionCode =
  | WarrantDecisionCode
  | "approval_required"
  | "approval_denied"
  | "approval_expired"
  | "execution_release_required"
  | "runtime_failed"
  | "branch_revoked";

export interface ProposalControlDecision {
  id: string;
  proposalId: string;
  rootRequestId: string;
  runtimeId: string;
  agentId: string;
  warrantId: string;
  parentWarrantId: string | null;
  decidedAt: string;
  decidedByKind: "policy" | "approval" | "user" | "system";
  decidedById: string;
  decision: ProposalControlDecisionType;
  code: ProposalControlDecisionCode;
  message: string;
}

export interface ActionAttempt {
  id: string;
  kind: ActionKind;
  agentId: string;
  warrantId: string;
  requestedAt: string;
  target?: ActionTarget;
  usage?: ActionUsageSnapshot;
}

export interface ActionAuthorizationSnapshot {
  allowed: boolean;
  code: WarrantDecisionCode;
  message: string;
  effectiveStatus: EffectiveWarrantStatus;
  blockedByWarrantId: string | null;
}

export interface LocalPolicyCheck {
  allowed: boolean;
  reason: string;
}

export interface ProviderActionFailure {
  code: ProviderActionFailureCode;
  message: string;
  detail: string;
  retryable: boolean;
}

export interface CalendarAvailabilityReadInput {
  calendarId?: string;
  startsAt: string;
  endsAt: string;
  timeZone?: string | null;
  maxResults?: number;
}

export interface CalendarBusySlot {
  startsAt: string;
  endsAt: string;
  summary: string;
}

export interface CalendarAvailabilityEvent {
  id: string;
  status: string;
  summary: string;
  startsAt: string | null;
  endsAt: string | null;
  attendees: string[];
  hangoutLink: string | null;
}

export interface CalendarAvailabilityPayload {
  calendarId: string;
  calendarLabel: string;
  startsAt: string;
  endsAt: string;
  timeZone: string | null;
  busySlots: CalendarBusySlot[];
  events: CalendarAvailabilityEvent[];
}

export interface GmailDraftInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  threadId?: string | null;
}

export interface GmailDraftPayload {
  endpoint: "gmail.drafts.create";
  draftId: string | null;
  messageId: string | null;
  threadId: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  previewText: string;
  createdAt: string | null;
}

export interface ExternalActionExecutionRelease {
  execute: true;
  releasedBy: "approval-layer" | "manual" | "demo";
  reason: string;
}

export interface GmailSendInput extends GmailDraftInput {
  draftId?: string | null;
}

export interface GmailSendPayload {
  endpoint: "gmail.messages.send" | "gmail.drafts.send";
  messageId: string | null;
  threadId: string | null;
  draftId: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  sentAt: string | null;
}

export interface ProviderActionEnvelope<Kind extends ActionKind, Input, Payload> {
  kind: Kind;
  state: ProviderActionState;
  provider: "google";
  connection: ProviderConnectionSnapshot;
  request: Input;
  headline: string;
  detail: string;
  data: Payload | null;
  failure: ProviderActionFailure | null;
  nextStep: string | null;
}

export type CalendarAvailabilityResult = ProviderActionEnvelope<
  "calendar.read",
  CalendarAvailabilityReadInput,
  CalendarAvailabilityPayload
>;

export type GmailDraftResult = ProviderActionEnvelope<"gmail.draft", GmailDraftInput, GmailDraftPayload>;

export type GmailSendResult = ProviderActionEnvelope<"gmail.send", GmailSendInput, GmailSendPayload>;

export type ProviderActionResult = CalendarAvailabilityResult | GmailDraftResult | GmailSendResult;

export interface ActionPathSnapshot {
  kind: ActionKind;
  label: string;
  state: ActionPathState;
  gate: ActionGate;
  headline: string;
  detail: string;
  nextStep: string | null;
}
