import type { EffectiveWarrantStatus } from "@/contracts/policy";
import type { WarrantContract } from "@/contracts/warrant";
import { createWarrantMap, toTimestamp } from "@/warrants/helpers";
import { createReason } from "@/warrants/reasons";
import type {
  EffectiveWarrantEvaluation,
} from "@/warrants/types";

export function evaluateWarrantStatus(
  warrant: WarrantContract,
  now: string,
): EffectiveWarrantStatus {
  if (warrant.status === "revoked" || warrant.revokedAt) {
    return "revoked";
  }

  if (warrant.status === "expired") {
    return "expired";
  }

  if (toTimestamp(warrant.expiresAt) <= toTimestamp(now)) {
    return "expired";
  }

  return "active";
}

export function evaluateEffectiveWarrantStatus(
  warrant: WarrantContract,
  warrants: readonly WarrantContract[],
  now: string,
): EffectiveWarrantEvaluation {
  const ownStatus = evaluateWarrantStatus(warrant, now);

  if (ownStatus === "revoked") {
    return {
      status: ownStatus,
      blockedByWarrantId: warrant.revocationSourceId ?? warrant.id,
      reason: createReason("warrant_revoked"),
    };
  }

  if (ownStatus === "expired") {
    return {
      status: ownStatus,
      blockedByWarrantId: warrant.id,
      reason: createReason("warrant_expired", {
        timestamp: warrant.expiresAt,
      }),
    };
  }

  const warrantMap = createWarrantMap(warrants);
  let currentParentId = warrant.parentId;

  while (currentParentId) {
    const parent = warrantMap.get(currentParentId);

    if (!parent) {
      break;
    }

    const parentStatus = evaluateWarrantStatus(parent, now);

    if (parentStatus === "revoked") {
      return {
        status: "revoked",
        blockedByWarrantId: parent.id,
        reason: createReason("ancestor_revoked", {
          blockedByWarrantId: parent.id,
        }),
      };
    }

    if (parentStatus === "expired") {
      return {
        status: "expired",
        blockedByWarrantId: parent.id,
        reason: createReason("ancestor_expired", {
          blockedByWarrantId: parent.id,
        }),
      };
    }

    currentParentId = parent.parentId;
  }

  return {
    status: "active",
    blockedByWarrantId: null,
    reason: null,
  };
}
