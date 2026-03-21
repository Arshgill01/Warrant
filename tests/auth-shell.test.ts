import { describe, expect, it } from "vitest";
import { getCalendarReadResult, getGmailSendResult } from "@/actions";
import { readAuth0Environment } from "@/auth/env";
import { buildGoogleConnectHref } from "@/connections/google";
import type { AuthSessionSnapshot, ProviderConnectionSnapshot } from "@/contracts";

const signedInSession: AuthSessionSnapshot = {
  state: "signed-in",
  headline: "Signed in as Demo User.",
  detail: "Demo session.",
  loginHref: null,
  logoutHref: "/auth/logout",
  user: {
    name: "Demo User",
    email: "demo@example.com",
    pictureUrl: null,
  },
};

const connectedGoogle: ProviderConnectionSnapshot = {
  provider: "google",
  state: "connected",
  headline: "Google is connected through Auth0.",
  detail: "Delegated access is available.",
  actionLabel: null,
  actionHref: null,
  accountLabel: "demo@example.com",
  tokenExpiresAt: null,
  via: "auth0-token-vault",
};

describe("auth shell environment", () => {
  it("requires Auth0 core environment values before enabling the shell", () => {
    const environment = readAuth0Environment({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      AUTH0_GOOGLE_CONNECTION_NAME: "google-oauth2",
    } as unknown as NodeJS.ProcessEnv);

    expect(environment.isConfigured).toBe(false);
    expect(environment.missingValues).toEqual([
      "AUTH0_DOMAIN",
      "AUTH0_CLIENT_ID",
      "AUTH0_CLIENT_SECRET",
      "AUTH0_SECRET",
    ]);
  });

  it("builds the Google connect route with delegated scopes", () => {
    const href = buildGoogleConnectHref("google-oauth2");

    expect(href).toContain("/auth/connect?");
    expect(href).toContain("connection=google-oauth2");
    expect(href).toContain("returnTo=%2F");
    expect(href).toContain("calendar.readonly");
    expect(href).toContain("gmail.compose");
    expect(href).toContain("gmail.send");
  });
});

describe("auth shell action paths", () => {
  it("blocks calendar reads when Auth0-backed Google access is unavailable", async () => {
    const result = await getCalendarReadResult({
      session: signedInSession,
      connection: {
        ...connectedGoogle,
        state: "unavailable",
        detail: "Google access is unavailable.",
      },
      policy: {
        allowed: true,
        reason: "Allowed by local policy.",
      },
    });

    expect(result.provider).toBe("google");
    expect(result.connectionState).toBe("unavailable");
    expect(result.path.state).toBe("blocked");
    expect(result.path.gate).toBe("auth0");
  });

  it("keeps Gmail send pending until approval is granted", async () => {
    const result = await getGmailSendResult({
      session: signedInSession,
      connection: connectedGoogle,
      policy: {
        allowed: true,
        reason: "Allowed by local policy.",
      },
      approvalStatus: "pending",
    });

    expect(result.approvalStatus).toBe("pending");
    expect(result.connectionState).toBe("connected");
    expect(result.path.state).toBe("pending");
    expect(result.path.gate).toBe("approval");
  });
});
