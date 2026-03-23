import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/demo/state/route";

const originalEnvironment = process.env;
const demoStateFile = join(tmpdir(), `warrant-demo-route-handler-${process.pid}.json`);

describe("demo rehearsal route", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      WARRANT_DEMO_STATE_FILE: demoStateFile,
    };
    rmSync(demoStateFile, { force: true });
  });

  afterEach(() => {
    rmSync(demoStateFile, { force: true });
    process.env = originalEnvironment;
  });

  it("returns 404 when demo rehearsal tools are disabled", async () => {
    delete process.env.WARRANT_ENABLE_DEMO_TOOLS;
    process.env = {
      ...process.env,
      NODE_ENV: "test",
    };

    const response = await GET();

    expect(response.status).toBe(404);
  });

  it("switches rehearsal presets through the JSON API when enabled", async () => {
    process.env.WARRANT_ENABLE_DEMO_TOOLS = "true";
    process.env = {
      ...process.env,
      NODE_ENV: "test",
    };

    const response = await POST(
      new Request("http://localhost:3000/api/demo/state", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          preset: "comms-revoked",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.preset).toBe("comms-revoked");
    expect(payload.label).toBe("Comms revoked");
  });

  it("supports the form-based reset path used by the demo page", async () => {
    process.env.WARRANT_ENABLE_DEMO_TOOLS = "true";
    process.env = {
      ...process.env,
      NODE_ENV: "test",
    };

    const formData = new URLSearchParams({
      preset: "main",
      returnTo: "/demo",
    });
    const response = await POST(
      new Request("http://localhost:3000/api/demo/state", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/demo");
  });
});
