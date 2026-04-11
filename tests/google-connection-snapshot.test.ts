import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSessionSnapshot } from "@/contracts";
import {
  AccessTokenForConnectionError,
  AccessTokenForConnectionErrorCode,
} from "@auth0/nextjs-auth0/errors";

const getAccessTokenForConnection = vi.hoisted(() => vi.fn());

vi.mock("@/auth", async () => {
  const errors = await import("@auth0/nextjs-auth0/errors");

  return {
    auth0: {
      getAccessTokenForConnection,
    },
    AccessTokenForConnectionError: errors.AccessTokenForConnectionError,
    AccessTokenForConnectionErrorCode: errors.AccessTokenForConnectionErrorCode,
  };
});

const signedInSession: AuthSessionSnapshot = {
  state: "signed-in",
  headline: "Signed in",
  detail: "Session is active.",
  loginHref: null,
  logoutHref: "/auth/logout",
  user: {
    name: "Demo User",
    email: "demo@example.com",
    pictureUrl: null,
  },
  diagnostics: {
    checkedAt: "2026-04-11T00:00:00.000Z",
    auth0Configured: true,
    auth0ClientReady: true,
    environmentIssues: [],
    hasSession: true,
    hasRefreshToken: true,
    userSub: "auth0|demo",
  },
};

describe("google connection snapshot gating", () => {
  beforeEach(() => {
    vi.resetModules();
    getAccessTokenForConnection.mockReset();
    process.env.AUTH0_DOMAIN = "tenant.example.auth0.com";
    process.env.AUTH0_CLIENT_ID = "client";
    process.env.AUTH0_CLIENT_SECRET = "secret";
    process.env.AUTH0_SECRET =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.AUTH0_GOOGLE_CONNECTION_NAME = "google-oauth2";
  });

  it("does not attempt delegated token exchange before connect callback evidence", async () => {
    getAccessTokenForConnection.mockResolvedValue({
      token: "ignored",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    const { getGoogleConnectionSnapshot } = await import("@/connections/google");
    const snapshot = await getGoogleConnectionSnapshot(signedInSession);

    expect(snapshot.state).toBe("not-connected");
    expect(snapshot.lifecycleState).toBe("connect-flow-not-started");
    expect(snapshot.actionLabel).toBe("Connect Google with Auth0");
    expect(snapshot.diagnostics?.tokenExchange.attempted).toBe(false);
    expect(snapshot.diagnostics?.connectedAccountEvidence).toBe("none");
    expect(getAccessTokenForConnection).not.toHaveBeenCalled();
  });

  it("attempts delegated token exchange after connect callback evidence returns", async () => {
    getAccessTokenForConnection.mockResolvedValue({
      token: "token-123",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    const { getGoogleConnectionSnapshot } = await import("@/connections/google");
    const snapshot = await getGoogleConnectionSnapshot(signedInSession, {
      connectFlow: {
        state: "started",
        attemptId: "attempt-1",
        checkedAt: "2026-04-11T00:00:00.000Z",
        errorCode: null,
        errorDetail: null,
        source: "query",
      },
    });

    expect(snapshot.state).toBe("connected");
    expect(snapshot.lifecycleState).toBe("delegated-ready");
    expect(snapshot.diagnostics?.tokenExchange.attempted).toBe(true);
    expect(snapshot.diagnostics?.connectedAccountEvidence).toBe("delegated-token-ready");
    expect(getAccessTokenForConnection).toHaveBeenCalledTimes(1);
  });

  it("does not treat session-email identity as delegated readiness proof on exchange failure", async () => {
    getAccessTokenForConnection.mockRejectedValue(
      new AccessTokenForConnectionError(
        AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE,
        "Failed to exchange refresh token for connected account.",
        {
          code: "federated_connection_refresh_token_not_found",
          message: "No federated connection refresh token found for the user.",
        } as never,
      ),
    );

    const { getGoogleConnectionSnapshot } = await import("@/connections/google");
    const snapshot = await getGoogleConnectionSnapshot(signedInSession, {
      allowTokenExchangeProbe: true,
    });

    expect(snapshot.state).toBe("not-connected");
    expect(snapshot.lifecycleState).toBe("connect-flow-not-started");
    expect(snapshot.actionLabel).toBe("Connect Google with Auth0");
    expect(snapshot.diagnostics?.accountLabelSource).toBe("session-email");
    expect(snapshot.diagnostics?.connectedAccountEvidence).toBe("none");
    expect(snapshot.diagnostics?.tokenExchange.outcome).toBe("failed-to-exchange");
  });

  it("marks bootstrap as attempted when connect-start already failed before handoff", async () => {
    const { getGoogleConnectionSnapshot } = await import("@/connections/google");
    const snapshot = await getGoogleConnectionSnapshot(signedInSession, {
      connectFlow: {
        state: "bootstrap-token-failure",
        attemptId: "attempt-2",
        checkedAt: "2026-04-11T00:00:00.000Z",
        errorCode: "http_401",
        errorDetail: "Failed to retrieve a connected account access token.",
        source: "query",
      },
    });

    expect(snapshot.lifecycleState).toBe("bootstrap-token-failure");
    expect(snapshot.diagnostics?.bootstrap.attempted).toBe(true);
    expect(snapshot.diagnostics?.bootstrap.outcome).toBe("failed");
    expect(snapshot.diagnostics?.connectFailureCode).toBe("http_401");
  });
});
