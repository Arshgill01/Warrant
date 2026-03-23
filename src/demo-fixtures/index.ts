import type { WorktreeBoundary } from "@/contracts";

export const demoFixturesBoundary: WorktreeBoundary = {
  key: "demo-fixtures",
  label: "Demo fixtures",
  path: "src/demo-fixtures",
  purpose: "Own deterministic mock data, seeded scenarios, and repeatable demo-state helpers.",
  futureWorktree: "Demo stability and rehearsal support",
  notes: "Keep the scenario stable enough for a reliable three-minute demo.",
  status: "reserved",
};

export * from "@/demo-fixtures/auth-shell";
export * from "@/demo-fixtures/display";
export * from "@/demo-fixtures/scenario";
