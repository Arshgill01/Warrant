import type { ApprovalStatus, ActionKind, ActionPathSnapshot, AuthSessionSnapshot, LocalPolicyCheck, ProviderConnectionSnapshot } from "@/contracts";
import { getGoogleConnectionSnapshot } from "@/connections/google";

interface ExternalActionContext {
  session: AuthSessionSnapshot;
  connection?: ProviderConnectionSnapshot;
  policy: LocalPolicyCheck;
  approvalStatus?: ApprovalStatus;
}

function buildPolicyBlockedSnapshot(kind: ActionKind, label: string, reason: string): ActionPathSnapshot {
  return {
    kind,
    label,
    state: "blocked",
    gate: "policy",
    headline: `${label} is blocked by local policy.`,
    detail: reason,
    nextStep: "The warrant engine will replace this placeholder policy check in a later track.",
  };
}

function buildAuth0Snapshot(
  kind: ActionKind,
  label: string,
  connection: ProviderConnectionSnapshot,
  readyDetail: string,
): ActionPathSnapshot {
  if (connection.state === "connected") {
    return {
      kind,
      label,
      state: "ready",
      gate: "auth0",
      headline: `${label} is ready to use delegated Google access.`,
      detail: readyDetail,
      nextStep: "A later track will attach the real Calendar or Gmail request to this Auth0-backed path.",
    };
  }

  if (connection.state === "pending") {
    return {
      kind,
      label,
      state: "pending",
      gate: "auth0",
      headline: `${label} is waiting for Google access.`,
      detail: connection.detail,
      nextStep: "Finish the Auth0 provider handoff before the agent uses this action.",
    };
  }

  return {
    kind,
    label,
    state: "blocked",
    gate: "auth0",
    headline: `${label} cannot run without Auth0-backed Google access.`,
    detail: connection.detail,
    nextStep: connection.actionLabel,
  };
}

export async function getCalendarReadPath(context: ExternalActionContext): Promise<ActionPathSnapshot> {
  if (!context.policy.allowed) {
    return buildPolicyBlockedSnapshot("calendar.read", "Calendar read", context.policy.reason);
  }

  const connection = context.connection ?? (await getGoogleConnectionSnapshot(context.session));

  return buildAuth0Snapshot(
    "calendar.read",
    "Calendar read",
    connection,
    "The local policy check is separate from Auth0. Once both are present, a Calendar agent can read availability through delegated Google access.",
  );
}

export async function getGmailDraftPath(context: ExternalActionContext): Promise<ActionPathSnapshot> {
  if (!context.policy.allowed) {
    return buildPolicyBlockedSnapshot("gmail.draft", "Gmail draft", context.policy.reason);
  }

  const connection = context.connection ?? (await getGoogleConnectionSnapshot(context.session));

  return buildAuth0Snapshot(
    "gmail.draft",
    "Gmail draft",
    connection,
    "Draft creation can use the delegated Google path after Auth0 confirms the connection, while send remains a separate sensitive action.",
  );
}

export async function getGmailSendPath(context: ExternalActionContext): Promise<ActionPathSnapshot> {
  if (!context.policy.allowed) {
    return buildPolicyBlockedSnapshot("gmail.send", "Gmail send", context.policy.reason);
  }

  const connection = context.connection ?? (await getGoogleConnectionSnapshot(context.session));

  if (connection.state !== "connected") {
    return buildAuth0Snapshot(
      "gmail.send",
      "Gmail send",
      connection,
      "The delegated Google path is available, but send still needs a separate approval decision.",
    );
  }

  switch (context.approvalStatus) {
    case "approved":
      return {
        kind: "gmail.send",
        label: "Gmail send",
        state: "ready",
        gate: "approval",
        headline: "Gmail send is ready once approval is granted.",
        detail: "Local policy and Auth0-backed Google access are already in place. The remaining guardrail is the explicit send approval state.",
        nextStep: "Approval-track work will attach the exact message preview and recipient blast radius.",
      };
    case "denied":
      return {
        kind: "gmail.send",
        label: "Gmail send",
        state: "blocked",
        gate: "approval",
        headline: "Gmail send is blocked until a person approves it.",
        detail: "Sensitive external actions stay blocked even when the local policy allows them and Auth0 can supply delegated access.",
        nextStep: "A later approval flow will show the exact draft, recipients, and reason for the send.",
      };
    case "expired":
      return {
        kind: "gmail.send",
        label: "Gmail send",
        state: "blocked",
        gate: "approval",
        headline: "Gmail send approval expired.",
        detail: "The external action can only proceed after a fresh approval, even though the Auth0 path remains available.",
        nextStep: "Request approval again with the latest draft preview.",
      };
    case "pending":
    default:
      return {
        kind: "gmail.send",
        label: "Gmail send",
        state: "pending",
        gate: "approval",
        headline: "Gmail send waits for a human approval step.",
        detail: "This is intentional. Auth0-backed access makes the external path real, while approval keeps sensitive sends legible and reversible.",
        nextStep: "Approval-track work will render the send preview and capture the decision.",
      };
  }
}
