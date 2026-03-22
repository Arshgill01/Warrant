import { describe, expect, it } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getCalendarReadPath, getGmailSendPath } from "@/actions";
import { readAuth0Environment } from "@/auth/env";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { buildGoogleConnectHref, getGoogleConnectionSetupSnapshot } from "@/connections/google";
import type { ActionPathSnapshot, AuthSessionSnapshot, ProviderConnectionSetupSnapshot, ProviderConnectionSnapshot } from "@/contracts";

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

const actionPaths: ActionPathSnapshot[] = [
  {
    kind: "calendar.read",
    label: "Calendar read",
    state: "ready",
    gate: "auth0",
    headline: "Calendar read is ready to use delegated Google access.",
    detail: "Delegated Calendar access is available.",
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
});

describe("auth shell action paths", () => {
  it("blocks calendar reads when Auth0-backed Google access is unavailable", async () => {
    const path = await getCalendarReadPath({
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

    expect(path.state).toBe("blocked");
    expect(path.gate).toBe("auth0");
  });

  it("keeps Gmail send pending until approval is granted", async () => {
    const path = await getGmailSendPath({
      session: signedInSession,
      connection: connectedGoogle,
      policy: {
        allowed: true,
        reason: "Allowed by local policy.",
      },
      approvalStatus: "pending",
    });

    expect(path.state).toBe("pending");
    expect(path.gate).toBe("approval");
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
        actionPaths,
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
        actionPaths,
      }),
    );

    expect(html).toContain("Signed-in email: demo@example.com");
    expect(html).toContain("Log out");
    expect(html).toContain("Token Vault connection id");
  });
});
