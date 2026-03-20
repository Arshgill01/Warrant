import type { WorktreeBoundary } from "@/contracts";

export const approvalsBoundary: WorktreeBoundary = {
  key: "approvals",
  label: "Approvals",
  path: "src/approvals",
  purpose: "Own sensitive-action approval requests, exact action previews, and approval outcome handling.",
  futureWorktree: "Send-email approval flow",
  notes: "Keep approval text legible and focused on consequences instead of OAuth jargon.",
  status: "reserved",
};
