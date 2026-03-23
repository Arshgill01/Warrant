import type {
  ActionPathSnapshot,
  ApprovalRequest,
  ApprovalStatus,
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
        headline: "No Auth0 approval request exists yet.",
        detail:
          "The Comms Agent can prepare the draft, but Warrant will not let the live Gmail send proceed until the exact email is submitted for Auth0-backed approval.",
        nextStep: "Request approval for this exact send preview.",
        executionReady: false,
      };
    case "pending":
      return {
        state,
        label: "Pending",
        headline: "Auth0 approval is pending for this exact email.",
        detail:
          "Recipients, subject, and body are frozen for review. The send path stays blocked until Auth0 returns an explicit decision.",
        nextStep: "Wait for approval or deny the send.",
        executionReady: false,
      };
    case "approved":
      return {
        state,
        label: "Approved",
        headline: "Auth0 approved this send request.",
        detail:
          "The approval layer can now mint the explicit execution release that allows the Gmail send boundary to proceed.",
        nextStep: "Execute the approved send through the Auth0-backed provider path.",
        executionReady: true,
      };
    case "denied":
      return {
        state,
        label: "Denied",
        headline: "The user denied this send request.",
        detail:
          "Local Warrant policy still allows the category in principle, but this specific email remains blocked because Auth0 approval was refused.",
        nextStep: "Keep the message as a draft or revise it before requesting approval again.",
        executionReady: false,
      };
    case "unavailable":
      return {
        state,
        label: "Unavailable",
        headline: "Auth0 approval is unavailable right now.",
        detail:
          "Warrant can evaluate the local send authority, but it cannot reach the external approval control required to release the live email.",
        nextStep: "Restore Auth0 approval availability before retrying this send.",
        executionReady: false,
      };
    case "error":
      return {
        state,
        label: "Error",
        headline: "Auth0 approval returned an unusable result.",
        detail:
          "The request exists, but Warrant could not derive a trustworthy approval decision, so send remains blocked.",
        nextStep: "Retry the approval check or re-request approval for this message.",
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

export function decideApprovalRequest(input: {
  request: ApprovalRequest;
  status: Exclude<ApprovalStatus, "pending">;
  decidedAt: string;
}): ApprovalRequest {
  return {
    ...input.request,
    status: input.status,
    decidedAt: input.decidedAt,
  };
}

export function mapApprovalStatusToSendApprovalState(
  status: ApprovalStatus,
): Extract<SendApprovalState, "pending" | "approved" | "denied"> {
  switch (status) {
    case "approved":
      return "approved";
    case "denied":
    case "expired":
      return "denied";
    case "pending":
      return "pending";
  }
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
          reason: "Auth0 approved this exact Gmail send request.",
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
    label: "Auth0 approval requirement",
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
      label: "Final execution readiness",
      state: "ready",
      gate: "auth0",
      headline: "Auth0 can now release the live Gmail send.",
      detail:
        "The local send category is allowed, approval is satisfied, and Warrant may hand the explicit release to the provider send boundary.",
      nextStep: "Run the Gmail send with the approval-layer release.",
    };
  }

  return {
    kind: "gmail.send",
    label: "Final execution readiness",
    state: state === "pending" ? "pending" : "blocked",
    gate: "auth0",
    headline: "The live Gmail send is still blocked.",
    detail:
      state === "pending"
        ? "Auth0 has the request, but no execution release exists yet."
        : "Without a valid Auth0 approval result, Warrant cannot release the live Gmail send.",
    nextStep: record.nextStep,
  };
}

export function buildSendApprovalBoundarySummary(
  state: SendApprovalState,
): SendApprovalBoundarySummary {
  return {
    localEligibility: {
      kind: "gmail.send",
      label: "Local Warrant eligibility",
      state: "ready",
      gate: "policy",
      headline: "The Comms warrant allows this send category.",
      detail:
        "Draft and send stay separate. This child warrant can draft freely and may attempt a bounded send, but that still does not authorize live external execution by itself.",
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
