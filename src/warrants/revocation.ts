import type { WarrantContract } from "@/contracts/warrant";
import {
  collectDescendantIds,
  createLineage,
} from "@/warrants/helpers";
import type {
  RevokeWarrantBranchInput,
  RevokeWarrantBranchResult,
  WarrantRevocationEvent,
} from "@/warrants/types";

export function revokeWarrantBranch(
  input: RevokeWarrantBranchInput,
): RevokeWarrantBranchResult {
  const rootWarrant = input.warrants.find(
    (warrant) => warrant.id === input.warrantId,
  );

  if (!rootWarrant) {
    throw new Error(`Unknown warrant: ${input.warrantId}`);
  }

  const revokedIds = new Set([
    input.warrantId,
    ...collectDescendantIds(input.warrants, input.warrantId),
  ]);
  const events: WarrantRevocationEvent[] = [];

  const warrants = input.warrants.map((warrant) => {
    if (!revokedIds.has(warrant.id) || warrant.status === "revoked") {
      return warrant;
    }

    const inherited = warrant.id !== input.warrantId;
    const nextWarrant: WarrantContract = {
      ...warrant,
      status: "revoked",
      revokedAt: input.revokedAt,
      revocationReason: inherited
        ? `Authority lost because ancestor warrant ${input.warrantId} was revoked.`
        : input.reason,
      revocationSourceId: input.warrantId,
      revokedBy: input.revokedBy,
    };

    events.push({
      warrantId: nextWarrant.id,
      lineage: createLineage(nextWarrant),
      metadata: {
        eventId: `${nextWarrant.id}:warrant.revoked`,
        occurredAt: input.revokedAt,
        type: "warrant.revoked",
        reason: nextWarrant.revocationReason ?? input.reason,
        inherited,
        revokedBy: input.revokedBy,
        revocationSourceId: input.warrantId,
      },
    });

    return nextWarrant;
  });

  return {
    warrants,
    revokedWarrantIds: events.map((event) => event.warrantId),
    events,
  };
}
