import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalEnvironment = process.env;

function clearAuthEnvironment() {
  delete process.env.AUTH0_DOMAIN;
  delete process.env.AUTH0_CLIENT_ID;
  delete process.env.AUTH0_CLIENT_SECRET;
  delete process.env.AUTH0_SECRET;
  delete process.env.APP_BASE_URL;
}

describe("middleware auth guardrails", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnvironment };
    clearAuthEnvironment();
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it("returns a structured 503 response for /auth routes when Auth0 env is incomplete", async () => {
    const { middleware } = await import("@/middleware");
    const request = new NextRequest("http://localhost:3000/auth/login");

    const response = await middleware(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toContain("Auth0 routes are unavailable");
    expect(payload.missingValues).toEqual(
      expect.arrayContaining([
        "AUTH0_DOMAIN",
        "AUTH0_CLIENT_ID",
        "AUTH0_CLIENT_SECRET",
        "AUTH0_SECRET",
        "APP_BASE_URL",
      ]),
    );
  });

  it("passes through non-auth routes when Auth0 env is incomplete", async () => {
    const { middleware } = await import("@/middleware");
    const request = new NextRequest("http://localhost:3000/demo");

    const response = await middleware(request);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
