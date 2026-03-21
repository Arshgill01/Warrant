import type { WorktreeBoundary } from "@/contracts";

export const authBoundary: WorktreeBoundary = {
  key: "auth",
  label: "Auth",
  path: "src/auth",
  purpose: "Own sign-in, session bootstrap, user identity loading, and Auth0 application wiring.",
  futureWorktree: "Auth0 sign-in and session foundation",
  notes: "Keep provider-specific connection logic out of this directory.",
  status: "reserved",
};

export * from "@/auth/auth0";
export * from "@/auth/env";
export * from "@/auth/session";
