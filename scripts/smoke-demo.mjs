#!/usr/bin/env node

import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { spawn } from "node:child_process";

const port = Number(process.env.SMOKE_PORT ?? 3107);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = 20_000;

const routeChecks = [
  {
    path: "/",
    markers: ["Auth0 Access Shell", "Open Wave 1 demo"],
  },
  {
    path: "/demo",
    markers: [
      "Wave 1 Demo Surface",
      "Delegation Tree",
      "Prepare my investor update for tomorrow and coordinate follow-ups.",
    ],
  },
];

function assertBuildArtifacts() {
  if (!existsSync(".next/BUILD_ID")) {
    throw new Error("Missing build artifacts (.next/BUILD_ID). Run `npm run build` before `npm run smoke:demo`.");
  }
}

async function waitForServerReady() {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still booting.
    }

    await delay(500);
  }

  throw new Error(`Smoke server did not become ready within ${timeoutMs}ms.`);
}

async function runRouteChecks() {
  for (const check of routeChecks) {
    const response = await fetch(`${baseUrl}${check.path}`);
    if (!response.ok) {
      throw new Error(`Smoke check failed for ${check.path}: expected HTTP 200, got ${response.status}.`);
    }

    const body = await response.text();
    for (const marker of check.markers) {
      if (!body.includes(marker)) {
        throw new Error(`Smoke check failed for ${check.path}: missing marker "${marker}".`);
      }
    }

    console.log(`smoke ok ${check.path}`);
  }
}

async function main() {
  assertBuildArtifacts();

  const server = spawn("npm", ["run", "start", "--", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  server.stdout.on("data", (chunk) => {
    process.stdout.write(`[smoke:start] ${chunk}`);
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(`[smoke:start] ${chunk}`);
  });

  try {
    await waitForServerReady();
    await runRouteChecks();
  } finally {
    server.kill("SIGTERM");
    await delay(300);
    if (!server.killed) {
      server.kill("SIGKILL");
    }
  }
}

main().catch((error) => {
  console.error(`smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
