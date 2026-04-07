import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = process.env;

describe("demo live preflight route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnvironment };
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it("returns 404 when demo tools are disabled", async () => {
    delete process.env.WARRANT_ENABLE_DEMO_TOOLS;
    process.env.NODE_ENV = "test";

    const { GET } = await import("@/app/api/demo/live-preflight/route");
    const response = await GET(
      new Request("http://localhost:3000/api/demo/live-preflight"),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Demo rehearsal tools are disabled.");
  });

  it("returns a structured blocked snapshot when enabled without live auth prerequisites", async () => {
    process.env.WARRANT_ENABLE_DEMO_TOOLS = "true";
    process.env.NODE_ENV = "test";

    const { GET } = await import("@/app/api/demo/live-preflight/route");
    const response = await GET(
      new Request("http://localhost:3000/api/demo/live-preflight"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("token-only");
    expect(payload.overallState).toBe("blocked");
    expect(Array.isArray(payload.checks)).toBe(true);
    expect(payload.checks.find((check: { id: string }) => check.id === "auth0_session")).toBeTruthy();
  });

  it("parses live mode from query params", async () => {
    process.env.WARRANT_ENABLE_DEMO_TOOLS = "true";
    process.env.NODE_ENV = "test";

    const { GET } = await import("@/app/api/demo/live-preflight/route");
    const response = await GET(
      new Request("http://localhost:3000/api/demo/live-preflight?mode=live"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("live");
  });

  it("returns a structured fatal-error envelope when preflight execution throws", async () => {
    process.env.WARRANT_ENABLE_DEMO_TOOLS = "true";
    process.env.NODE_ENV = "test";

    vi.doMock("@/demo-fixtures/live-preflight", async () => {
      const actual =
        await vi.importActual<typeof import("@/demo-fixtures/live-preflight")>(
          "@/demo-fixtures/live-preflight",
        );

      return {
        ...actual,
        runDemoLivePreflight: async () => {
          throw new Error("simulated live preflight failure");
        },
      };
    });

    const { GET } = await import("@/app/api/demo/live-preflight/route");
    const response = await GET(
      new Request("http://localhost:3000/api/demo/live-preflight?mode=live"),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.overallState).toBe("error");
    expect(payload.fatalError?.message).toContain("simulated live preflight failure");
  });
});
