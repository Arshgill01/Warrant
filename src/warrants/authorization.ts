import type { ActionAttempt } from "@/contracts/action";
import type { WarrantContract } from "@/contracts/warrant";
import {
  actionUsesRecipients,
  createLineage,
  getActionRecipients,
  getRecipientDomain,
  isWithinCalendarWindow,
  normalizeResourceConstraints,
} from "@/warrants/helpers";
import { createReason } from "@/warrants/reasons";
import { evaluateEffectiveWarrantStatus } from "@/warrants/status";
import type {
  AllowedAuthorizationResult,
  AuthorizationResult,
  DeniedAuthorizationResult,
} from "@/warrants/types";

function buildAllowedResult(
  warrant: WarrantContract,
  action: ActionAttempt,
  now: string,
): AllowedAuthorizationResult {
  const message = "This action is within the warrant's allowed authority.";

  return {
    allowed: true,
    code: "allowed",
    message,
    warrantId: warrant.id,
    lineage: createLineage(warrant),
    effectiveStatus: "active",
    metadata: {
      eventId: `${action.id}:action.authorization`,
      occurredAt: now,
      actionId: action.id,
      actionKind: action.kind,
      outcome: "allowed",
      decisionCode: "allowed",
      message,
    },
  };
}

function buildDeniedResult(
  warrant: WarrantContract,
  action: ActionAttempt,
  now: string,
  reason: ReturnType<typeof createReason>,
  effectiveStatus: "expired" | "revoked" | "active",
  blockedByWarrantId: string | null,
): DeniedAuthorizationResult {
  return {
    allowed: false,
    code: reason.code,
    message: reason.message,
    reason,
    blockedByWarrantId,
    warrantId: warrant.id,
    lineage: createLineage(warrant),
    effectiveStatus,
    metadata: {
      eventId: `${action.id}:action.authorization`,
      occurredAt: now,
      actionId: action.id,
      actionKind: action.kind,
      outcome: "denied",
      decisionCode: reason.code,
      message: reason.message,
    },
  };
}

function denyIfResourceBlocked(
  warrant: WarrantContract,
  action: ActionAttempt,
  now: string,
): AuthorizationResult | null {
  const constraints = normalizeResourceConstraints(warrant.resourceConstraints);

  if (actionUsesRecipients(action.kind)) {
    const recipients = getActionRecipients(action);

    if (
      (constraints.allowedRecipients || constraints.allowedDomains) &&
      recipients.length === 0
    ) {
      return buildDeniedResult(
        warrant,
        action,
        now,
        createReason("recipients_required"),
        "active",
        warrant.id,
      );
    }

    if (constraints.allowedRecipients) {
      const invalidRecipient = recipients.find(
        (recipient) => !constraints.allowedRecipients?.includes(recipient),
      );

      if (invalidRecipient) {
        return buildDeniedResult(
          warrant,
          action,
          now,
          createReason("recipient_not_allowed", {
            recipient: invalidRecipient,
          }),
          "active",
          warrant.id,
        );
      }
    }

    if (constraints.allowedDomains) {
      const invalidRecipient = recipients.find(
        (recipient) =>
          !constraints.allowedDomains?.includes(getRecipientDomain(recipient)),
      );

      if (invalidRecipient) {
        return buildDeniedResult(
          warrant,
          action,
          now,
          createReason("domain_not_allowed"),
          "active",
          warrant.id,
        );
      }
    }
  }

  if (
    (action.kind === "calendar.read" || action.kind === "calendar.schedule") &&
    constraints.calendarWindow
  ) {
    if (!action.target?.scheduledFor) {
      return buildDeniedResult(
        warrant,
        action,
        now,
        createReason("scheduled_time_required"),
        "active",
        warrant.id,
      );
    }

    if (
      !isWithinCalendarWindow(
        action.target.scheduledFor,
        constraints.calendarWindow,
      )
    ) {
      return buildDeniedResult(
        warrant,
        action,
        now,
        createReason("calendar_window_exceeded"),
        "active",
        warrant.id,
      );
    }
  }

  if (action.kind === "docs.read" && constraints.allowedFolderIds) {
    if (!action.target?.folderId) {
      return buildDeniedResult(
        warrant,
        action,
        now,
        createReason("folder_required"),
        "active",
        warrant.id,
      );
    }

    if (!constraints.allowedFolderIds.includes(action.target.folderId)) {
      return buildDeniedResult(
        warrant,
        action,
        now,
        createReason("folder_not_allowed", {
          folderId: action.target.folderId,
        }),
        "active",
        warrant.id,
      );
    }
  }

  if (
    action.kind === "gmail.send" &&
    constraints.maxSends !== undefined &&
    (action.usage?.sendsUsed ?? 0) >= constraints.maxSends
  ) {
    return buildDeniedResult(
      warrant,
      action,
      now,
      createReason("usage_limit_exceeded", {
        actionKind: action.kind,
        maxUsage: constraints.maxSends,
      }),
      "active",
      warrant.id,
    );
  }

  if (
    action.kind === "gmail.draft" &&
    constraints.maxDrafts !== undefined &&
    (action.usage?.draftsUsed ?? 0) >= constraints.maxDrafts
  ) {
    return buildDeniedResult(
      warrant,
      action,
      now,
      createReason("usage_limit_exceeded", {
        actionKind: action.kind,
        maxUsage: constraints.maxDrafts,
      }),
      "active",
      warrant.id,
    );
  }

  return null;
}

export function authorizeAction(input: {
  warrant: WarrantContract;
  warrants: readonly WarrantContract[];
  action: ActionAttempt;
  now: string;
}): AuthorizationResult {
  const status = evaluateEffectiveWarrantStatus(
    input.warrant,
    input.warrants,
    input.now,
  );

  if (input.action.warrantId !== input.warrant.id) {
    return buildDeniedResult(
      input.warrant,
      input.action,
      input.now,
      createReason("warrant_mismatch"),
      status.status,
      input.warrant.id,
    );
  }

  if (input.action.agentId !== input.warrant.agentId) {
    return buildDeniedResult(
      input.warrant,
      input.action,
      input.now,
      createReason("agent_not_holder"),
      status.status,
      input.warrant.id,
    );
  }

  if (status.reason) {
    return buildDeniedResult(
      input.warrant,
      input.action,
      input.now,
      status.reason,
      status.status,
      status.blockedByWarrantId,
    );
  }

  if (!input.warrant.capabilities.includes(input.action.kind)) {
    return buildDeniedResult(
      input.warrant,
      input.action,
      input.now,
      createReason("capability_missing", {
        capability: input.action.kind,
      }),
      "active",
      input.warrant.id,
    );
  }

  const blockedResult = denyIfResourceBlocked(
    input.warrant,
    input.action,
    input.now,
  );

  if (blockedResult) {
    return blockedResult;
  }

  return buildAllowedResult(input.warrant, input.action, input.now);
}
