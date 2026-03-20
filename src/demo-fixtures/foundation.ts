import type { WorktreeBoundary } from "@/contracts";
import { actionsBoundary } from "@/actions";
import { agentsBoundary } from "@/agents";
import { approvalsBoundary } from "@/approvals";
import { auditBoundary } from "@/audit";
import { authBoundary } from "@/auth";
import { connectionsBoundary } from "@/connections";
import { demoFixturesBoundary } from "@/demo-fixtures";
import { graphBoundary } from "@/graph";
import { warrantsBoundary } from "@/warrants";

export const foundationBoundaries: WorktreeBoundary[] = [
  authBoundary,
  connectionsBoundary,
  warrantsBoundary,
  agentsBoundary,
  approvalsBoundary,
  actionsBoundary,
  graphBoundary,
  auditBoundary,
  demoFixturesBoundary,
  {
    key: "contracts",
    label: "Contracts",
    path: "src/contracts",
    purpose: "Own cross-worktree shared types that define the minimum coordination surface.",
    futureWorktree: "Shared coordination updates",
    notes: "Keep these contracts narrow so changes do not cause unnecessary merge churn.",
    status: "shared",
  },
];
