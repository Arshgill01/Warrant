import { describe, expect, it } from "vitest";
import { executeSendEmail, prepareGmailDraft, readCalendarAvailability } from "@/actions";
import { readAuth0Environment } from "@/auth/env";
import { buildGoogleConnectHref } from "@/connections/google";
import { authShellProviderRequests, authShellSendReleasePreview } from "@/demo-fixtures";
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

describe("provider-backed action wrappers", () => {
  it("surfaces disconnected Google state on the calendar read path", async () => {
    const result = await readCalendarAvailability(authShellProviderRequests.calendarAvailability, {
      session: signedInSession,
      connection: {
        ...connectedGoogle,
        state: "not-connected",
        headline: "Google is not connected yet.",
        detail: "Connect Google through Auth0 before the Calendar Agent reads availability.",
        actionLabel: "Connect Google with Auth0",
        actionHref: "/auth/connect",
      },
    });

    expect(result.state).toBe("disconnected");
    expect(result.failure?.code).toBe("provider-disconnected");
    expect(result.data).toBeNull();
  });

  it("returns a structured Gmail draft success envelope", async () => {
    const result = await prepareGmailDraft(authShellProviderRequests.gmailDraft, {
      session: signedInSession,
      connection: connectedGoogle,
      accessToken: "token",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            id: "draft-123",
            message: {
              id: "message-123",
              threadId: "thread-123",
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
    });

    expect(result.state).toBe("success");
    expect(result.data).toMatchObject({
      endpoint: "gmail.drafts.create",
      draftId: "draft-123",
      messageId: "message-123",
      threadId: "thread-123",
      subject: authShellProviderRequests.gmailDraft.subject,
    });
    expect(result.failure).toBeNull();
  });

  it("keeps send execution blocked until another layer explicitly releases it", async () => {
    const result = await executeSendEmail(authShellProviderRequests.gmailSend, {
      session: signedInSession,
      connection: connectedGoogle,
    });

    expect(result.state).toBe("execution-blocked");
    expect(result.failure?.code).toBe("execution-release-required");
    expect(result.data).toBeNull();
  });

  it("uses a distinct Gmail send execution path after release", async () => {
    const result = await executeSendEmail(authShellProviderRequests.gmailSend, {
      session: signedInSession,
      connection: connectedGoogle,
      accessToken: "token",
      release: authShellSendReleasePreview,
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            id: "message-456",
            threadId: "thread-456",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
    });

    expect(result.state).toBe("success");
    expect(result.data).toMatchObject({
      endpoint: "gmail.messages.send",
      messageId: "message-456",
      threadId: "thread-456",
      subject: authShellProviderRequests.gmailSend.subject,
    });
    expect(result.failure).toBeNull();
  });
});
