import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectAccountError, MyAccountApiError } from "@auth0/nextjs-auth0/errors";

const originalFetch = global.fetch;

describe("google connect-start route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("forwards successful /auth/connect redirects", async () => {
    global.fetch = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: {
          location: "https://example.auth0.com/continue-connect",
          "set-cookie": "auth_verification=txn123; Path=/; HttpOnly; Secure",
        },
      })) as unknown as typeof fetch;

    const { GET } = await import("@/app/api/connect/google/route");
    const response = await GET(
      new Request("http://localhost:3000/api/connect/google?returnTo=%2Fdemo"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.auth0.com/continue-connect");
    expect(response.headers.get("set-cookie")).toContain("auth_verification=txn123");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("maps bootstrap token failures before provider handoff", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: "access_token_error",
          error_description: "Failed to retrieve a connected account access token.",
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
            "set-cookie": "appSession=rotated; Path=/; HttpOnly; Secure",
          },
        },
      )) as unknown as typeof fetch;

    const { GET } = await import("@/app/api/connect/google/route");
    const response = await GET(
      new Request("http://localhost:3000/api/connect/google?returnTo=%2F"),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("googleConnectFlow=bootstrap-token-failure");
    expect(location).toContain("googleConnectCode=access_token_error");
    expect(response.headers.get("set-cookie")).toContain("appSession=rotated");
  });

  it("maps tenant/config failures", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: "configuration_error",
          message: "Auth0 routes are unavailable because server auth configuration is incomplete.",
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json",
          },
        },
      )) as unknown as typeof fetch;

    const { GET } = await import("@/app/api/connect/google/route");
    const response = await GET(
      new Request("http://localhost:3000/api/connect/google?returnTo=%2F"),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("googleConnectFlow=tenant-config-issue");
  });

  it("maps callback/redirect failures", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: "invalid_request",
          error_description: "Callback URL mismatch for redirect.",
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        },
      )) as unknown as typeof fetch;

    const { GET } = await import("@/app/api/connect/google/route");
    const response = await GET(
      new Request("http://localhost:3000/api/connect/google?returnTo=%2F"),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("googleConnectFlow=callback-redirect-issue");
  });

  it("maps generic connect-initiation http_400 failures to tenant/config issue", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: "failed_to_initiate",
          message: "The request to initiate the connect account flow failed with status 400.",
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json",
          },
        },
      )) as unknown as typeof fetch;

    const { GET } = await import("@/app/api/connect/google/route");
    const response = await GET(
      new Request("http://localhost:3000/api/connect/google?returnTo=%2F"),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("googleConnectFlow=tenant-config-issue");
    expect(location).toContain("googleConnectCode=failed_to_initiate");
  });

  it("surfaces SDK connectAccount initiation errors before redirecting back", async () => {
    const connectAccount = vi.fn(async () => {
      throw new ConnectAccountError({
        code: "failed_to_initiate",
        message: "The request to initiate the connect account flow failed with status 400.",
        cause: new MyAccountApiError({
          type: "invalid_body",
          title: "Validation error",
          detail: "connection is not enabled for this application",
          status: 400,
          validationErrors: [{ detail: "connection must be enabled for client" }],
        }),
      });
    });

    vi.doMock("@/auth", async () => {
      const actual = await vi.importActual<typeof import("@/auth")>("@/auth");
      return {
        ...actual,
        auth0: {
          connectAccount,
        },
      };
    });

    const { GET } = await import("@/app/api/connect/google/route");
    const response = await GET(
      new Request("http://localhost:3000/api/connect/google?returnTo=%2F"),
    );

    expect(connectAccount).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(302);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("googleConnectFlow=tenant-config-issue");
    expect(location).toContain("googleConnectCode=failed_to_initiate");
    expect(location).toContain("connection+is+not+enabled+for+this+application");
  });
});
