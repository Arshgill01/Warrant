import { NextResponse } from "next/server";
import {
  isDemoToolsEnabled,
  loadDemoRehearsalSnapshot,
  restoreDemoStatePreset,
  type DemoScenarioPreset,
} from "@/demo-fixtures/state";

export const dynamic = "force-dynamic";

function createJsonResponse(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init?.headers,
    },
  });
}

function createDisabledResponse(): NextResponse {
  return createJsonResponse(
    {
      error: "Demo rehearsal tools are disabled.",
    },
    { status: 404 },
  );
}

function isPreset(value: unknown): value is DemoScenarioPreset {
  return value === "main" || value === "comms-revoked";
}

export async function GET(): Promise<NextResponse> {
  if (!isDemoToolsEnabled()) {
    return createDisabledResponse();
  }

  return createJsonResponse(loadDemoRehearsalSnapshot());
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isDemoToolsEnabled()) {
    return createDisabledResponse();
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { preset?: unknown };

    if (!isPreset(body.preset)) {
      return createJsonResponse(
        {
          error: "Expected preset to be one of: main, comms-revoked.",
        },
        { status: 400 },
      );
    }

    restoreDemoStatePreset(body.preset);

    return createJsonResponse(loadDemoRehearsalSnapshot());
  }

  const formData = await request.formData();
  const preset = formData.get("preset");
  const returnTo = formData.get("returnTo");

  if (!isPreset(preset)) {
    return createJsonResponse(
      {
        error: "Expected preset to be one of: main, comms-revoked.",
      },
      { status: 400 },
    );
  }

  restoreDemoStatePreset(preset);

  const redirectTarget =
    typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/demo";

  return NextResponse.redirect(new URL(redirectTarget, request.url), {
    status: 303,
    headers: {
      "cache-control": "no-store",
    },
  });
}
