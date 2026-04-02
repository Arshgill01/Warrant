import { describe, expect, it } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { executeSendEmail, prepareGmailDraft, readCalendarAvailability } from "@/actions";
import { readAuth0Environment } from "@/auth/env";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { buildGoogleConnectHref, getGoogleConnectionSetupSnapshot } from "@/connections/google";
import { authShellProviderRequests, authShellSendReleasePreview } from "@/demo-fixtures";
import type {
  AuthSessionSnapshot,
  ProviderActionResult,
  ProviderConnectionSetupSnapshot,
  ProviderConnectionSnapshot,
} from "@/contracts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

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

const googleSetup: ProviderConnectionSetupSnapshot = {
  provider: "google",
  status: "ready",
  headline: "Google can be linked through Auth0's connected-account flow.",
  detail: "Delegated Google access is ready to be requested.",
  connectionName: "google-oauth2",
  requestedScopes: [
    "openid",
    "profile",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
  ],
  requestedAuthParams: [
    { key: "access_type", value: "offline" },
    { key: "prompt", value: "consent" },
  ],
  tokenVaultConnectionId: null,
};

const providerResults: ProviderActionResult[] = [
  {
    kind: "calendar.read",
    state: "success",
    provider: "google",
    connection: connectedGoogle,
    request: authShellProviderRequests.calendarAvailability,
    headline: "Calendar availability is ready.",
    detail: "Delegated Google access returned deterministic availability data.",
    data: {
      calendarId: "primary",
      calendarLabel: "Primary",
      startsAt: authShellProviderRequests.calendarAvailability.startsAt,
      endsAt: authShellProviderRequests.calendarAvailability.endsAt,
      timeZone: authShellProviderRequests.calendarAvailability.timeZone ?? null,
      busySlots: [],
      events: [],
    },
    failure: null,
    nextStep: null,
  },
];

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
    expect(href).toContain("access_type=offline");
    expect(href).toContain("prompt=consent");
    expect(href).toContain("scopes=openid");
    expect(href).toContain("scopes=profile");
    expect(href).toContain("calendar.readonly");
    expect(href).toContain("gmail.compose");
    expect(href).toContain("gmail.send");
  });

  it("summarizes Google setup readiness from configured Auth0 env", () => {
    const previousEnv = process.env;
    process.env = {
      ...previousEnv,
      AUTH0_DOMAIN: "tenant.example.auth0.com",
      AUTH0_CLIENT_ID: "client-id",
      AUTH0_CLIENT_SECRET: "client-secret",
      AUTH0_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      APP_BASE_URL: "http://localhost:3000",
      AUTH0_GOOGLE_CONNECTION_NAME: "google-oauth2",
    };

    try {
      const snapshot = getGoogleConnectionSetupSnapshot();

      expect(snapshot.status).toBe("ready");
      expect(snapshot.connectionName).toBe("google-oauth2");
      expect(snapshot.requestedAuthParams).toEqual([
        { key: "access_type", value: "offline" },
        { key: "prompt", value: "consent" },
      ]);
    } finally {
      process.env = previousEnv;
    }
  });

  it("marks Auth0 setup invalid when secret length is too short", () => {
    const environment = readAuth0Environment({
      AUTH0_DOMAIN: "tenant.example.auth0.com",
      AUTH0_CLIENT_ID: "client-id",
      AUTH0_CLIENT_SECRET: "client-secret",
      AUTH0_SECRET: "too-short",
      APP_BASE_URL: "http://localhost:3000",
    } as unknown as NodeJS.ProcessEnv);

    expect(environment.isConfigured).toBe(false);
    expect(environment.invalidValues).toEqual([
      "AUTH0_SECRET must be at least 32 characters (64 hex characters recommended).",
    ]);
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

  it("surfaces expired delegated Google access explicitly", async () => {
    const result = await readCalendarAvailability(authShellProviderRequests.calendarAvailability, {
      session: signedInSession,
      connection: {
        ...connectedGoogle,
        state: "expired",
        headline: "Google delegated access has expired.",
        detail: "Refresh Auth0 before retrying Calendar access.",
        actionLabel: "Refresh Auth0 session",
        actionHref: "/auth/logout",
      },
    });

    expect(result.state).toBe("unavailable");
    expect(result.failure?.code).toBe("provider-expired");
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

  it("reports invalid provider payloads with a structured failure code", async () => {
    const result = await prepareGmailDraft(authShellProviderRequests.gmailDraft, {
      session: signedInSession,
      connection: connectedGoogle,
      accessToken: "token",
      fetchFn: async () =>
        new Response("<not-json>", {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        }),
    });

    expect(result.state).toBe("failed");
    expect(result.failure?.code).toBe("provider-response-invalid");
    expect(result.data).toBeNull();
  });
});

describe("auth shell rendering", () => {
  it("renders a signed-out shell with a login affordance", () => {
    const html = renderToStaticMarkup(
      createElement(AuthShell, {
        session: {
          state: "signed-out",
          headline: "Sign in before agents request external access.",
          detail: "Auth0 manages the app session separately from provider access.",
          loginHref: "/auth/login",
          logoutHref: null,
          user: null,
        },
        googleConnection: {
          ...connectedGoogle,
          state: "not-connected",
          headline: "Google is not connected yet.",
          detail: "Sign in and connect Google through Auth0.",
          actionLabel: "Sign in with Auth0",
          actionHref: "/auth/login",
        },
        googleSetup,
        providerResults,
      }),
    );

    expect(html).toContain("Continue with Auth0");
    expect(html).toContain("Google Token Vault readiness");
  });

  it("renders a signed-in shell with a logout affordance", () => {
    const html = renderToStaticMarkup(
      createElement(AuthShell, {
        session: signedInSession,
        googleConnection: connectedGoogle,
        googleSetup,
        providerResults,
      }),
    );

    expect(html).toContain("Signed-in email: demo@example.com");
    expect(html).toContain("Log out");
    expect(html).toContain("Token Vault connection id");
  });
});
