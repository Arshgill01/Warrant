import type {
  ActionPathSnapshot,
  ApprovalRequest,
  SendApprovalBoundarySummary,
  SendApprovalState,
  SendApprovalStateRecord,
} from "@/contracts";

function createApprovalStateRecord(
  state: SendApprovalState,
): Omit<SendApprovalStateRecord, "release"> {
  switch (state) {
    case "not-requested":
      return {
        state,
        label: "Not requested",
        headline: "This exact email has not been submitted for approval yet.",
        detail:
          "Comms can draft the message, but it cannot send a real email until Maya reviews this exact subject, body, and recipient list through Auth0.",
        nextStep: "Submit this exact email for approval.",
        executionReady: false,
      };
    case "pending":
      return {
        state,
        label: "Pending",
        headline: "Human approval is pending for this exact email.",
        detail:
          "Recipients, subject, and body are frozen for review. The real send stays blocked until Maya approves or denies this exact message.",
        nextStep: "Wait for a human decision on this send.",
        executionReady: false,
      };
    case "approved":
      return {
        state,
        label: "Approved",
        headline: "Approval was granted for this exact email.",
        detail:
          "Warrant now has the approval it needs to release one real Gmail send for this reviewed message.",
        nextStep: "Run the approved send through the Auth0-backed Gmail path.",
        executionReady: true,
      };
    case "denied":
      return {
        state,
        label: "Denied",
        headline: "Approval was denied for this exact email.",
        detail:
          "The branch is allowed to ask for this kind of send, but this specific message stays blocked because Maya denied it.",
        nextStep: "Keep the message as a draft or revise it before requesting approval again.",
        executionReady: false,
      };
    case "unavailable":
      return {
        state,
        label: "Unavailable",
        headline: "The approval service is unavailable right now.",
        detail:
          "Warrant can tell that this branch may request the send, but it cannot reach the external approval control needed to release the real email.",
        nextStep: "Restore approval availability before retrying this send.",
        executionReady: false,
      };
    case "error":
      return {
        state,
        label: "Error",
        headline: "The approval result could not be trusted.",
        detail:
          "The request exists, but Warrant could not confirm a usable approval decision, so the send remains blocked.",
        nextStep: "Retry the approval check or request approval again for this message.",
        executionReady: false,
      };
  }
}

export function createSendApprovalRequest(input: {
  id: string;
  actionId: string;
  warrantId: string;
  requestedByAgentId: string;
  title: string;
  reason: string;
  subject: string;
  bodyText: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  draftId?: string | null;
  requestedAt: string;
  expiresAt: string;
  blastRadius: string;
}): ApprovalRequest {
  return {
    id: input.id,
    actionId: input.actionId,
    warrantId: input.warrantId,
    requestedByAgentId: input.requestedByAgentId,
    reason: input.reason,
    status: "pending",
    title: input.title,
    preview: {
      actionKind: "gmail.send",
      subject: input.subject,
      bodyText: input.bodyText,
      to: [...input.to],
      cc: [...(input.cc ?? [])],
      bcc: [...(input.bcc ?? [])],
      draftId: input.draftId ?? null,
    },
    requestedAt: input.requestedAt,
    expiresAt: input.expiresAt,
    decidedAt: null,
    affectedRecipients: [...input.to],
    blastRadius: input.blastRadius,
    provider: "auth0",
  };
}

export function buildSendApprovalStateRecord(
  state: SendApprovalState,
): SendApprovalStateRecord {
  const record = createApprovalStateRecord(state);

  return {
    ...record,
    release: record.executionReady
      ? {
          execute: true,
          releasedBy: "approval-layer",
          reason: "Human approval was granted for this exact Gmail send request.",
        }
      : null,
  };
}

function buildApprovalPathSnapshot(
  state: SendApprovalState,
): ActionPathSnapshot {
  const record = buildSendApprovalStateRecord(state);

  return {
    kind: "gmail.send",
    label: "Human approval check",
    state:
      state === "approved"
        ? "ready"
        : state === "pending"
          ? "pending"
          : "blocked",
    gate: "approval",
    headline: record.headline,
    detail: record.detail,
    nextStep: record.nextStep,
  };
}

function buildExecutionPathSnapshot(
  state: SendApprovalState,
): ActionPathSnapshot {
  const record = buildSendApprovalStateRecord(state);

  if (state === "approved") {
    return {
      kind: "gmail.send",
      label: "Real send release",
      state: "ready",
      gate: "auth0",
      headline: "The real Gmail send can now be released.",
      detail:
        "Local policy allows the send, the human approval check passed, and Warrant may now hand one explicit release to the provider send boundary.",
      nextStep: "Run the Gmail send with the approval release.",
    };
  }

  return {
    kind: "gmail.send",
    label: "Real send release",
    state: state === "pending" ? "pending" : "blocked",
    gate: "auth0",
    headline: "The real Gmail send is still blocked.",
    detail:
      state === "pending"
        ? "Auth0 has the approval request, but no release exists yet to send a real email."
        : "Without a valid approval result, Warrant cannot release the real Gmail send.",
    nextStep: record.nextStep,
  };
}

export function buildSendApprovalBoundarySummary(
  state: SendApprovalState,
): SendApprovalBoundarySummary {
  return {
    localEligibility: {
      kind: "gmail.send",
      label: "Local warrant check",
      state: "ready",
      gate: "policy",
      headline: "This branch may request one bounded send.",
      detail:
        "The child warrant lets Comms draft freely and ask to send one email to approved recipients. It does not let Comms send on its own.",
      nextStep: null,
    },
    approvalRequirement: buildApprovalPathSnapshot(state),
    executionReadiness: buildExecutionPathSnapshot(state),
  };
}

export function buildSendApprovalStateMatrix(): SendApprovalStateRecord[] {
  const states: SendApprovalState[] = [
    "not-requested",
    "pending",
    "approved",
    "denied",
    "unavailable",
    "error",
  ];

  return states.map(buildSendApprovalStateRecord);
}
