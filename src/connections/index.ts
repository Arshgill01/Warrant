import type { WorktreeBoundary } from "@/contracts";

export const connectionsBoundary: WorktreeBoundary = {
  key: "connections",
  label: "Connections",
  path: "src/connections",
  purpose: "Own Token Vault-backed provider connection status, onboarding, and external capability readiness.",
  futureWorktree: "Google connection and delegated capability UX",
  notes: "This boundary should make Auth0 Token Vault visibly load-bearing.",
  status: "reserved",
};

export * from "@/connections/google";
