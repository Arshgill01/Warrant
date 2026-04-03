import type { ActionKind, WarrantContract } from "@/contracts";
import type { PlannerStructuredPlan } from "@/agents/types";

export interface PlannerSemanticValidation {
  ok: boolean;
  issues: string[];
}

const ROLE_CAPABILITY_ALLOWLIST: Record<string, ActionKind[]> = {
  calendar: ["calendar.read", "calendar.schedule"],
  comms: ["gmail.draft", "gmail.send"],
};

export function validatePlannerSemantics(
  plan: PlannerStructuredPlan,
  parentWarrant: WarrantContract,
): PlannerSemanticValidation {
  const issues: string[] = [];
  const seenRoles = new Set<string>();

  for (const [index, draft] of plan.delegationDrafts.entries()) {
    if (seenRoles.has(draft.childRole)) {
      issues.push(`delegationDrafts[${index}] duplicates childRole '${draft.childRole}'.`);
      continue;
    }
    seenRoles.add(draft.childRole);

    const roleAllowed = ROLE_CAPABILITY_ALLOWLIST[draft.childRole] ?? [];
    for (const capability of draft.requestedCapabilities) {
      if (!roleAllowed.includes(capability)) {
        issues.push(
          `delegationDrafts[${index}] requests capability '${capability}' outside ${draft.childRole} role bounds.`,
        );
      }
      if (!parentWarrant.capabilities.includes(capability)) {
        issues.push(
          `delegationDrafts[${index}] requests capability '${capability}' missing from parent warrant.`,
        );
      }
    }
  }

  const hasCalendarReadDraft = plan.delegationDrafts.some(
    (draft) =>
      draft.childRole === "calendar" &&
      draft.requestedCapabilities.includes("calendar.read"),
  );
  if (!hasCalendarReadDraft) {
    issues.push("Plan must include calendar.read delegation for schedule context.");
  }

  const hasCommsDraftDraft = plan.delegationDrafts.some(
    (draft) =>
      draft.childRole === "comms" &&
      draft.requestedCapabilities.includes("gmail.draft"),
  );
  if (!hasCommsDraftDraft) {
    issues.push("Plan must include gmail.draft delegation for follow-up drafting.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

