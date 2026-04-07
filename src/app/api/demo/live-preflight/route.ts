import { NextResponse } from "next/server";
import type { DemoLivePreflightMode } from "@/contracts";
import {
  createLivePreflightErrorSnapshot,
  resolveDemoLivePreflightMode,
  runDemoLivePreflight,
} from "@/demo-fixtures/live-preflight";
import { isDemoToolsEnabled } from "@/demo-fixtures/state";

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

function resolveMode(request: Request): DemoLivePreflightMode {
  const searchParams = new URL(request.url).searchParams;
  return resolveDemoLivePreflightMode(searchParams.get("mode"));
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isDemoToolsEnabled()) {
    return createDisabledResponse();
  }

  const mode = resolveMode(request);

  try {
    const snapshot = await runDemoLivePreflight({ mode });
    return createJsonResponse(snapshot);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unknown live preflight failure.";
    const fallback = createLivePreflightErrorSnapshot({
      mode,
      message,
    });

    return createJsonResponse(fallback, { status: 500 });
  }
}
