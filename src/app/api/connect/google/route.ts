import { NextResponse } from "next/server";
import { logLiveProviderDiagnostic } from "@/auth/live-provider-diagnostics";
import { buildGoogleConnectHref } from "@/connections/google";
import {
  appendGoogleConnectFlowContext,
  classifyGoogleConnectStartFailure,
  normalizeReturnToPath,
} from "@/connections/google-connect-flow";
import { getAuth0Environment } from "@/auth/env";

export const dynamic = "force-dynamic";

function nowIsoString(): string {
  return new Date().toISOString();
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeErrorCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return /^[a-z0-9._:-]{1,100}$/.test(normalized) ? normalized : null;
}

async function readConnectStartError(response: Response): Promise<{
  errorCode: string | null;
  errorMessage: string | null;
}> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    const textBody = await response.text();
    return {
      errorCode: null,
      errorMessage: readString(textBody),
    };
  }

  const body = (await response.json()) as Record<string, unknown>;

  return {
    errorCode: readString(body.code) ?? readString(body.error),
    errorMessage:
      readString(body.message) ??
      readString(body.error_description) ??
      readString(body.detail),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const returnTo = normalizeReturnToPath(requestUrl.searchParams.get("returnTo"));
  const authEnv = getAuth0Environment();
  const attemptId = crypto.randomUUID();
  const checkedAt = nowIsoString();

  const connectReturnTo = appendGoogleConnectFlowContext(returnTo, {
    state: "started",
    attemptId,
    checkedAt,
  });
  const connectHref = buildGoogleConnectHref(authEnv.googleConnectionName, connectReturnTo);
  const connectTarget = new URL(connectHref, requestUrl.origin);

  logLiveProviderDiagnostic("google.connect.start.attempt", {
    attemptId,
    connectionName: authEnv.googleConnectionName,
    connectHref,
    returnTo: connectReturnTo,
  });

  const connectResponse = await fetch(connectTarget.toString(), {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      accept: request.headers.get("accept") ?? "text/html,application/json",
      "user-agent": request.headers.get("user-agent") ?? "warrant-google-connect-start",
    },
    redirect: "manual",
    cache: "no-store",
  });

  const redirectLocation = connectResponse.headers.get("location");
  if (
    connectResponse.status >= 300 &&
    connectResponse.status < 400 &&
    redirectLocation
  ) {
    logLiveProviderDiagnostic("google.connect.start.forward_redirect", {
      attemptId,
      status: connectResponse.status,
      hasRedirectLocation: true,
    });

    return NextResponse.redirect(new URL(redirectLocation, requestUrl.origin), {
      status: 302,
    });
  }

  const connectError = await readConnectStartError(connectResponse);
  const flowState = classifyGoogleConnectStartFailure({
    status: connectResponse.status,
    errorCode: connectError.errorCode,
    errorMessage: connectError.errorMessage,
  });
  const errorCode = normalizeErrorCode(connectError.errorCode) ?? `http_${connectResponse.status}`;
  const errorDetail =
    connectError.errorMessage ??
    (normalizeErrorCode(connectError.errorCode) ? null : connectError.errorCode) ??
    "Auth0 could not start the connected-account flow before provider handoff.";
  const failureReturnTo = appendGoogleConnectFlowContext(returnTo, {
    state: flowState,
    attemptId,
    checkedAt,
    errorCode,
    errorDetail,
  });

  logLiveProviderDiagnostic("google.connect.start.failed", {
    attemptId,
    status: connectResponse.status,
    flowState,
    errorCode,
    errorDetail,
  });

  return NextResponse.redirect(new URL(failureReturnTo, requestUrl.origin), {
    status: 302,
  });
}
