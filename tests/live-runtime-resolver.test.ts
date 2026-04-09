import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resolveDemoRuntimeMode,
  resolveDemoScenarioForRuntime,
} from "@/demo-fixtures/live-runtime";

const originalEnvironment = process.env;

describe("live runtime resolver", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
    };
    delete process.env.GOOGLE_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it("parses runtime mode from query values", () => {
    expect(resolveDemoRuntimeMode("token-only")).toBe("token-only");
    expect(resolveDemoRuntimeMode("live")).toBe("live");
    expect(resolveDemoRuntimeMode("seeded")).toBe("seeded");
    expect(resolveDemoRuntimeMode("unknown")).toBe("token-only");
    expect(resolveDemoRuntimeMode(undefined)).toBe("token-only");
  });

  it("returns explicit seeded lane when seeded mode is requested", async () => {
    const scenario = await resolveDemoScenarioForRuntime({
      mode: "seeded",
      preset: "main",
    });

    expect(scenario.runtimeExecution.requestedMode).toBe("seeded");
    expect(scenario.runtimeExecution.lane).toBe("seeded-fallback");
    expect(scenario.runtimeExecution.seededFallbackUsed).toBe(true);
    expect(scenario.runtimeExecution.fallbackReason).toMatch(/explicitly selected/i);
  });

  it("makes token-only fallback explicit when live model startup is unavailable", async () => {
    const scenario = await resolveDemoScenarioForRuntime({
      mode: "token-only",
      preset: "main",
    });

    expect(scenario.runtimeExecution.requestedMode).toBe("token-only");
    expect(scenario.runtimeExecution.lane).toBe("seeded-fallback");
    expect(scenario.runtimeExecution.seededFallbackUsed).toBe(true);
    expect(scenario.runtimeExecution.fallbackReason).toMatch(/runtime model startup validation failed/i);
  });

  it("makes live-provider fallback explicit when live model startup is unavailable", async () => {
    const scenario = await resolveDemoScenarioForRuntime({
      mode: "live",
      preset: "main",
    });

    expect(scenario.runtimeExecution.requestedMode).toBe("live");
    expect(scenario.runtimeExecution.lane).toBe("seeded-fallback");
    expect(scenario.runtimeExecution.seededFallbackUsed).toBe(true);
    expect(scenario.runtimeExecution.fallbackReason).toMatch(/runtime model startup validation failed/i);
  });
});
