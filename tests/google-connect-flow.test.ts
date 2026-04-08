import { describe, expect, it } from "vitest";
import {
  appendGoogleConnectFlowContext,
  buildGoogleConnectStartHref,
  classifyGoogleConnectStartFailure,
  readGoogleConnectFlowContext,
} from "@/connections/google-connect-flow";

describe("google connect flow helpers", () => {
  it("builds a connect-start href with a safe return path", () => {
    expect(buildGoogleConnectStartHref("/demo")).toBe("/api/connect/google?returnTo=%2Fdemo");
    expect(buildGoogleConnectStartHref("https://malicious.example")).toBe("/api/connect/google?returnTo=%2F");
  });

  it("reads explicit flow diagnostics from query params", () => {
    const context = readGoogleConnectFlowContext({
      googleConnectFlow: "bootstrap-token-failure",
      googleConnectAttempt: "attempt-123",
      googleConnectAt: "2026-04-08T00:00:00.000Z",
      googleConnectCode: "access_token_error",
      googleConnectDetail: "Failed to retrieve a connected account access token.",
    });

    expect(context.state).toBe("bootstrap-token-failure");
    expect(context.attemptId).toBe("attempt-123");
    expect(context.errorCode).toBe("access_token_error");
  });

  it("maps callback style query errors to callback/redirect issues", () => {
    const context = readGoogleConnectFlowContext({
      error: "invalid_request",
      error_description: "Callback URL mismatch for redirect",
    });

    expect(context.state).toBe("callback-redirect-issue");
    expect(context.errorCode).toBe("invalid_request");
  });

  it("appends flow diagnostics onto a local return path", () => {
    const returnTo = appendGoogleConnectFlowContext("/demo", {
      state: "tenant-config-issue",
      attemptId: "attempt-456",
      checkedAt: "2026-04-08T00:00:00.000Z",
      errorCode: "http_503",
      errorDetail: "Auth0 configuration is incomplete.",
    });

    expect(returnTo).toContain("/demo?");
    expect(returnTo).toContain("googleConnectFlow=tenant-config-issue");
    expect(returnTo).toContain("googleConnectCode=http_503");
  });

  it("classifies bootstrap token failures before Google handoff", () => {
    expect(
      classifyGoogleConnectStartFailure({
        status: 401,
        errorCode: "access_token_error",
        errorMessage: "Failed to retrieve a connected account access token.",
      }),
    ).toBe("bootstrap-token-failure");
  });
});
