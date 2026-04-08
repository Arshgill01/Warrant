#!/usr/bin/env node

const baseUrl = process.env.LIVE_PREFLIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const mode = process.env.LIVE_PREFLIGHT_MODE ?? "live";
const cookie = process.env.LIVE_PREFLIGHT_COOKIE ?? "";
const endpoint = `${baseUrl.replace(/\/$/, "")}/api/demo/live-preflight?mode=${encodeURIComponent(mode)}`;

function printCheck(check) {
  console.log(`[${check.state}] ${check.label}`);
  console.log(`  ${check.headline}`);
  console.log(`  ${check.detail}`);
  if (Array.isArray(check.diagnostics) && check.diagnostics.length > 0) {
    check.diagnostics.forEach((line) => {
      console.log(`  diagnostic: ${line}`);
    });
  }
}

async function main() {
  const headers = {};
  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(
      `Live preflight did not return JSON (${response.status}). ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    const fatal = payload?.fatalError
      ? `${payload.fatalError.code}: ${payload.fatalError.message}`
      : payload?.error ?? "Unknown route failure.";
    throw new Error(`Live preflight route failed (${response.status}). ${fatal}`);
  }

  console.log(`mode: ${payload.mode}`);
  console.log(`checkedAt: ${payload.checkedAt}`);
  console.log(`overall: ${payload.overallState}`);
  console.log(`summary: ${payload.summary}`);

  if (Array.isArray(payload.checks)) {
    payload.checks.forEach(printCheck);
  }

  if (payload.overallState !== "ready") {
    throw new Error(
      "Live preflight is not ready. Inspect blocked/error checks and fix readiness before demo recording.",
    );
  }
}

main().catch((error) => {
  console.error(
    `smoke auth0-live failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
