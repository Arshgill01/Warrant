import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const originalEnvironment = process.env;
const demoStateFile = join(tmpdir(), `warrant-routes-demo-state-${process.pid}.json`);

function installReactRuntime() {
  Object.assign(globalThis, {
    React,
  });
}

function clearAuthEnvironment() {
  delete process.env.AUTH0_DOMAIN;
  delete process.env.AUTH0_CLIENT_ID;
  delete process.env.AUTH0_CLIENT_SECRET;
  delete process.env.AUTH0_SECRET;
  delete process.env.APP_BASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.AUTH0_AUDIENCE;
  delete process.env.AUTH0_TOKEN_VAULT_CONNECTION_ID;
  delete process.env.AUTH0_GOOGLE_CONNECTION_NAME;
  delete process.env.WARRANT_GOOGLE_CONNECTION_STATE;
  delete process.env.WARRANT_GOOGLE_CONNECTION_EMAIL;
}

describe("route rendering", () => {
  beforeEach(() => {
    process.env = { ...originalEnvironment };
    clearAuthEnvironment();
    process.env.WARRANT_DEMO_STATE_FILE = demoStateFile;
    rmSync(demoStateFile, { force: true });
    installReactRuntime();
  });

  afterEach(() => {
    rmSync(demoStateFile, { force: true });
    process.env = originalEnvironment;
  });

  it("renders the demo route with the canonical seeded scenario", async () => {
    const { default: DemoPage, dynamic: demoDynamic, metadata: demoMetadata } = await import("@/app/demo/page");
    const html = renderToStaticMarkup(React.createElement(DemoPage));

    expect(demoDynamic).toBe("force-dynamic");
    expect(demoMetadata.title).toBe("Warrant | Wave 1 Demo");
    expect(html).toContain("Delegated Authority Demo");
    expect(html).toContain("Investor update for April 18");
    expect(html).toContain("Prepare my investor update for tomorrow and coordinate follow-ups.");
    expect(html).toContain("Root Warrant Approval");
    expect(html).toContain("Maya authorizes Planner Agent to handle this request and delegate only narrower child warrants for calendar and email work.");
    expect(html).toContain("Canonical Proof Points");
    expect(html).toContain("Sensitive Action Approval");
    expect(html).toContain("Draft authority is not send authority.");
    expect(html).toContain("Approve investor follow-up send");
    expect(html).toContain("Latest approval record");
    expect(html).toContain("pending in auth0");
    expect(html).toContain("current: pending");
    expect(html).toContain("What changes when approval changes");
    expect(html).toContain("When authority ends");
    expect(html).toContain("Revocation and expiry do different jobs.");
    expect(html).toContain("Maya revoked the Comms branch after the approved send to prove that delegated authority can be withdrawn immediately.");
    expect(html).toContain("Authorization Timeline");
    expect(html).toContain("Comms child warrant delegated");
    expect(html).toContain("Draft investor follow-ups for approved recipients and request one send after approval.");
    expect(html).toContain("Tried to send the investor follow-up to a recipient outside this branch.");
    expect(html).toContain("Policy code: recipient_not_allowed");
    expect(html).not.toContain("Post-Revoke Failure");
  });

  it("renders the gated rehearsal controls when demo tools are enabled", async () => {
    process.env.WARRANT_ENABLE_DEMO_TOOLS = "true";

    const { default: DemoPage } = await import("@/app/demo/page");
    const html = renderToStaticMarkup(React.createElement(DemoPage));

    expect(html).toContain("Demo-only rehearsal tools");
    expect(html).toContain("Restore a known-good state before each take.");
    expect(html).toContain("Main scenario");
    expect(html).toContain("Comms revoked");
  });

  it("renders the auth shell route in the safe fallback state without Auth0 config", async () => {
    const { default: HomePage, dynamic } = await import("@/app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(dynamic).toBe("force-dynamic");
    expect(html).toContain("Auth0 Access Shell");
    expect(html).toContain("Auth0 setup is incomplete.");
    expect(html).toContain("Google connection is unavailable.");
    expect(html).toContain("Open Wave 1 demo");
  });
});
