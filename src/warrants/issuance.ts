import type { WarrantContract } from "@/contracts/warrant";
import {
  capabilitiesUseCalendar,
  capabilitiesUseFolders,
  capabilitiesUseRecipients,
  getRecipientDomain,
  hasCapability,
  isChildWindowWithinParent,
  normalizeCapabilities,
  normalizeResourceConstraints,
  toTimestamp,
} from "@/warrants/helpers";
import { createReason } from "@/warrants/reasons";
import { evaluateWarrantStatus } from "@/warrants/status";
import type {
  ChildWarrantInput,
  ChildWarrantValidationResult,
  IssueChildWarrantResult,
  IssueRootWarrantInput,
  PolicyReason,
  ValidateChildWarrantInput,
} from "@/warrants/types";

function validateCapabilitySubset(
  parent: WarrantContract,
  child: ChildWarrantInput,
): PolicyReason[] {
  const reasons: PolicyReason[] = [];

  for (const capability of child.capabilities) {
    if (!parent.capabilities.includes(capability)) {
      reasons.push(createReason("child_capability_exceeds_parent"));
      break;
    }
  }

  return reasons;
}

function validateRecipientConstraints(
  parent: WarrantContract,
  child: ChildWarrantInput,
): PolicyReason[] {
  const reasons: PolicyReason[] = [];
  const parentConstraints = normalizeResourceConstraints(parent.resourceConstraints);
  const childConstraints = normalizeResourceConstraints(child.resourceConstraints);

  if (!capabilitiesUseRecipients(child.capabilities)) {
    return reasons;
  }

  if (parentConstraints.allowedRecipients) {
    if (!childConstraints.allowedRecipients) {
      reasons.push(createReason("child_recipients_exceed_parent"));
    } else if (
      childConstraints.allowedRecipients.some(
        (recipient) => !parentConstraints.allowedRecipients?.includes(recipient),
      )
    ) {
      reasons.push(createReason("child_recipients_exceed_parent"));
    }
  }

  if (parentConstraints.allowedDomains) {
    if (childConstraints.allowedDomains) {
      if (
        childConstraints.allowedDomains.some(
          (domain) => !parentConstraints.allowedDomains?.includes(domain),
        )
      ) {
        reasons.push(createReason("child_domains_exceed_parent"));
      }
    } else if (childConstraints.allowedRecipients) {
      const invalidRecipient = childConstraints.allowedRecipients.find(
        (recipient) =>
          !parentConstraints.allowedDomains?.includes(getRecipientDomain(recipient)),
      );

      if (invalidRecipient) {
        reasons.push(createReason("child_domains_exceed_parent"));
      }
    } else {
      reasons.push(createReason("child_domains_exceed_parent"));
    }
  }

  if (hasCapability(child.capabilities, "gmail.send")) {
    if (
      parentConstraints.maxSends !== undefined &&
      (childConstraints.maxSends === undefined ||
        childConstraints.maxSends > parentConstraints.maxSends)
    ) {
      reasons.push(createReason("child_send_limit_exceeds_parent"));
    }
  }

  if (hasCapability(child.capabilities, "gmail.draft")) {
    if (
      parentConstraints.maxDrafts !== undefined &&
      (childConstraints.maxDrafts === undefined ||
        childConstraints.maxDrafts > parentConstraints.maxDrafts)
    ) {
      reasons.push(createReason("child_draft_limit_exceeds_parent"));
    }
  }

  return reasons;
}

function validateCalendarConstraints(
  parent: WarrantContract,
  child: ChildWarrantInput,
): PolicyReason[] {
  const reasons: PolicyReason[] = [];
  const parentConstraints = normalizeResourceConstraints(parent.resourceConstraints);
  const childConstraints = normalizeResourceConstraints(child.resourceConstraints);

  if (!capabilitiesUseCalendar(child.capabilities)) {
    return reasons;
  }

  if (
    parentConstraints.calendarWindow &&
    (!childConstraints.calendarWindow ||
      !isChildWindowWithinParent(
        childConstraints.calendarWindow,
        parentConstraints.calendarWindow,
      ))
  ) {
    reasons.push(createReason("child_calendar_window_exceeds_parent"));
  }

  return reasons;
}

function validateFolderConstraints(
  parent: WarrantContract,
  child: ChildWarrantInput,
): PolicyReason[] {
  const reasons: PolicyReason[] = [];
  const parentConstraints = normalizeResourceConstraints(parent.resourceConstraints);
  const childConstraints = normalizeResourceConstraints(child.resourceConstraints);

  if (!capabilitiesUseFolders(child.capabilities)) {
    return reasons;
  }

  if (parentConstraints.allowedFolderIds) {
    if (!childConstraints.allowedFolderIds) {
      reasons.push(createReason("child_folder_access_exceeds_parent"));
    } else if (
      childConstraints.allowedFolderIds.some(
        (folderId) => !parentConstraints.allowedFolderIds?.includes(folderId),
      )
    ) {
      reasons.push(createReason("child_folder_access_exceeds_parent"));
    }
  }

  return reasons;
}

export function issueRootWarrant(input: IssueRootWarrantInput): WarrantContract {
  const createdAt = input.createdAt;
  const expiresAt = input.expiresAt;

  return {
    id: input.id,
    parentId: null,
    rootRequestId: input.rootRequestId,
    createdBy: input.createdBy,
    agentId: input.agentId,
    purpose: input.purpose,
    capabilities: normalizeCapabilities(input.capabilities),
    resourceConstraints: normalizeResourceConstraints(input.resourceConstraints),
    canDelegate: input.canDelegate,
    maxChildren: input.canDelegate ? input.maxChildren : 0,
    createdAt,
    expiresAt,
    status: toTimestamp(expiresAt) <= toTimestamp(createdAt) ? "expired" : "active",
    revokedAt: null,
    revocationReason: null,
    revocationSourceId: null,
    revokedBy: null,
  };
}

export function validateChildWarrant(
  input: ValidateChildWarrantInput,
): ChildWarrantValidationResult {
  const reasons: PolicyReason[] = [];
  const existingChildrenCount = input.existingChildrenCount ?? 0;
  const parentStatus = evaluateWarrantStatus(input.parent, input.now);

  if (parentStatus === "revoked") {
    reasons.push(createReason("warrant_revoked"));
  }

  if (parentStatus === "expired") {
    reasons.push(
      createReason("warrant_expired", {
        timestamp: input.parent.expiresAt,
      }),
    );
  }

  if (
    !input.parent.canDelegate ||
    !input.parent.capabilities.includes("warrant.issue")
  ) {
    reasons.push(createReason("delegation_not_allowed"));
  }

  if (existingChildrenCount >= input.parent.maxChildren) {
    reasons.push(
      createReason("max_children_exceeded", {
        maxChildren: input.parent.maxChildren,
      }),
    );
  }

  if (toTimestamp(input.child.expiresAt) > toTimestamp(input.parent.expiresAt)) {
    reasons.push(createReason("child_expiry_exceeds_parent"));
  }

  if (input.child.canDelegate && !input.parent.canDelegate) {
    reasons.push(createReason("child_can_delegate_exceeds_parent"));
  }

  if (input.child.maxChildren > input.parent.maxChildren) {
    reasons.push(createReason("child_max_children_exceeds_parent"));
  }

  reasons.push(...validateCapabilitySubset(input.parent, input.child));
  reasons.push(...validateRecipientConstraints(input.parent, input.child));
  reasons.push(...validateCalendarConstraints(input.parent, input.child));
  reasons.push(...validateFolderConstraints(input.parent, input.child));

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

export function issueChildWarrant(
  input: ValidateChildWarrantInput,
): IssueChildWarrantResult {
  const validation = validateChildWarrant(input);

  if (!validation.valid) {
    return {
      ok: false,
      reason: validation.reasons[0],
      reasons: validation.reasons,
    };
  }

  return {
    ok: true,
    warrant: {
      id: input.child.id,
      parentId: input.parent.id,
      rootRequestId: input.parent.rootRequestId,
      createdBy: input.child.createdBy,
      agentId: input.child.agentId,
      purpose: input.child.purpose,
      capabilities: normalizeCapabilities(input.child.capabilities),
      resourceConstraints: normalizeResourceConstraints(
        input.child.resourceConstraints,
      ),
      canDelegate: input.child.canDelegate,
      maxChildren: input.child.canDelegate ? input.child.maxChildren : 0,
      createdAt: input.now,
      expiresAt: input.child.expiresAt,
      status:
        toTimestamp(input.child.expiresAt) <= toTimestamp(input.now)
          ? "expired"
          : "active",
      revokedAt: null,
      revocationReason: null,
      revocationSourceId: null,
      revokedBy: null,
    },
  };
}
