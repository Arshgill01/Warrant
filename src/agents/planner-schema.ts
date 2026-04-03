import type { ActionKind } from "@/contracts";
import type {
  PlannerChildRole,
  PlannerDelegationDraft,
  PlannerStructuredPlan,
} from "@/agents/types";

export const PLANNER_SCHEMA_NAME = "planner.delegation-plan.v1";
export const PLANNER_SCHEMA_DESCRIPTION = [
  "Output JSON only.",
  "Shape:",
  "- goalInterpretation: non-empty string.",
  "- delegationDrafts: non-empty array.",
  "- delegationDrafts[].childRole: one of calendar|comms.",
  "- delegationDrafts[].objective: non-empty string.",
  "- delegationDrafts[].requestedCapabilities: non-empty ActionKind array.",
].join("\n");

export interface PlannerSchemaIssue {
  path: string;
  message: string;
}

export interface PlannerSchemaValidation {
  ok: boolean;
  issues: PlannerSchemaIssue[];
  plan: PlannerStructuredPlan | null;
}

const VALID_CHILD_ROLES: PlannerChildRole[] = ["calendar", "comms"];
const VALID_ACTION_KINDS: ActionKind[] = [
  "calendar.read",
  "calendar.schedule",
  "docs.read",
  "gmail.draft",
  "gmail.send",
  "warrant.issue",
  "warrant.revoke",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseDelegationDraft(
  value: unknown,
  index: number,
  issues: PlannerSchemaIssue[],
): PlannerDelegationDraft | null {
  const path = `delegationDrafts[${index}]`;
  if (!isObject(value)) {
    issues.push({ path, message: "Expected object draft entry." });
    return null;
  }

  const childRole = value.childRole;
  if (typeof childRole !== "string" || !VALID_CHILD_ROLES.includes(childRole as PlannerChildRole)) {
    issues.push({
      path: `${path}.childRole`,
      message: "Expected one of: calendar, comms.",
    });
    return null;
  }

  const objective = value.objective;
  if (typeof objective !== "string" || objective.trim().length === 0) {
    issues.push({
      path: `${path}.objective`,
      message: "Expected non-empty objective string.",
    });
    return null;
  }

  const requestedCapabilities = value.requestedCapabilities;
  if (!Array.isArray(requestedCapabilities) || requestedCapabilities.length === 0) {
    issues.push({
      path: `${path}.requestedCapabilities`,
      message: "Expected non-empty capability array.",
    });
    return null;
  }

  const invalidCapabilities = requestedCapabilities.filter(
    (capability) =>
      typeof capability !== "string" ||
      !VALID_ACTION_KINDS.includes(capability as ActionKind),
  );
  if (invalidCapabilities.length > 0) {
    issues.push({
      path: `${path}.requestedCapabilities`,
      message: "Contains unknown capability values.",
    });
    return null;
  }

  return {
    childRole: childRole as PlannerChildRole,
    objective: objective.trim(),
    requestedCapabilities: requestedCapabilities as ActionKind[],
  };
}

export function validatePlannerStructuredPlan(raw: unknown): PlannerSchemaValidation {
  const issues: PlannerSchemaIssue[] = [];

  if (!isObject(raw)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "Expected top-level JSON object." }],
      plan: null,
    };
  }

  const rawGoalInterpretation = raw.goalInterpretation;
  if (typeof rawGoalInterpretation !== "string" || rawGoalInterpretation.trim().length === 0) {
    issues.push({
      path: "goalInterpretation",
      message: "Expected non-empty goalInterpretation string.",
    });
  }

  const delegationDraftsRaw = raw.delegationDrafts;
  if (!Array.isArray(delegationDraftsRaw) || delegationDraftsRaw.length === 0) {
    issues.push({
      path: "delegationDrafts",
      message: "Expected a non-empty delegationDrafts array.",
    });
  }

  const delegationDrafts: PlannerDelegationDraft[] = Array.isArray(delegationDraftsRaw)
    ? delegationDraftsRaw
      .map((draft, index) => parseDelegationDraft(draft, index, issues))
      .filter((draft): draft is PlannerDelegationDraft => draft !== null)
    : [];
  const goalInterpretation =
    typeof rawGoalInterpretation === "string"
      ? rawGoalInterpretation.trim()
      : "";

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
      plan: null,
    };
  }

  return {
    ok: true,
    issues,
    plan: {
      goalInterpretation,
      delegationDrafts,
    },
  };
}
