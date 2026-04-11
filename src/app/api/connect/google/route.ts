import { ConnectAccountError } from "@auth0/nextjs-auth0/errors";
import { NextResponse } from "next/server";
import { auth0 } from "@/auth";
import { logLiveProviderDiagnostic } from "@/auth/live-provider-diagnostics";
import {
  buildGoogleConnectHref,
  googleConnectAuthorizationParams,
  googleDelegatedScopes,
} from "@/connections/google";
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

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeErrorCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return /^[a-z0-9._:-]{1,100}$/.test(normalized) ? normalized : null;
}

function readSetCookieHeaders(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithGetSetCookie.getSetCookie === "function") {
    return headersWithGetSetCookie.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function appendSetCookieHeaders(source: Headers, target: Headers): void {
  const setCookies = readSetCookieHeaders(source);

  setCookies.forEach((cookie) => {
    target.append("set-cookie", cookie);
  });
}

async function readConnectStartError(response: Response): Promise<{
  status: number;
  errorCode: string | null;
  errorMessage: string | null;
}> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    const textBody = await response.text();
    return {
      status: response.status,
      errorCode: null,
      errorMessage: readString(textBody),
    };
  }

  const body = (await response.json()) as Record<string, unknown>;

  return {
    status: response.status,
    errorCode: readString(body.code) ?? readString(body.error),
    errorMessage:
      readString(body.message) ??
      readString(body.error_description) ??
      readString(body.detail),
  };
}

function readValidationErrorDetail(value: unknown): string | null {
  const record = readRecord(value);
  if (!record) {
    return null;
  }

  return readString(record.detail) ?? readString(record.message);
}

function readConnectStartErrorFromException(error: unknown): {
  status: number;
  errorCode: string | null;
  errorMessage: string | null;
} {
  if (error instanceof ConnectAccountError) {
    const cause = readRecord(error.cause);
    const causeStatus = readNumber(cause?.status) ?? 400;
    const causeDetail = readString(cause?.detail);
    const causeTitle = readString(cause?.title);
    const validationErrors = Array.isArray(cause?.validationErrors)
      ? cause.validationErrors
      : [];
    const validationDetail = validationErrors
      .map((entry) => readValidationErrorDetail(entry))
      .find((value): value is string => Boolean(value));
    const detailParts = [causeDetail, validationDetail, causeTitle, readString(error.message)]
      .filter((value): value is string => Boolean(value))
      .slice(0, 3);

    return {
      status: causeStatus,
      errorCode: readString(error.code) ?? readString(cause?.type),
      errorMessage: detailParts.length ? detailParts.join(" | ") : null,
    };
  }

  const record = readRecord(error);
  return {
    status: readNumber(record?.status) ?? 500,
    errorCode: readString(record?.code) ?? null,
    errorMessage: readString(record?.message) ?? null,
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

  if (auth0) {
    try {
      const connectResponse = await auth0.connectAccount({
        connection: authEnv.googleConnectionName,
        scopes: [...googleDelegatedScopes],
        authorizationParams: {
          ...googleConnectAuthorizationParams,
        },
        returnTo: connectReturnTo,
      });

      logLiveProviderDiagnostic("google.connect.start.forward_redirect", {
        attemptId,
        status: connectResponse.status,
        hasRedirectLocation: Boolean(connectResponse.headers.get("location")),
        via: "auth0-client",
      });

      return connectResponse;
    } catch (error) {
      const connectError = readConnectStartErrorFromException(error);
      const flowState = classifyGoogleConnectStartFailure({
        status: connectError.status,
        errorCode: connectError.errorCode,
        errorMessage: connectError.errorMessage,
      });
      const errorCode = normalizeErrorCode(connectError.errorCode) ?? `http_${connectError.status}`;
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
        status: connectError.status,
        flowState,
        errorCode,
        errorDetail,
        via: "auth0-client",
      });

      return NextResponse.redirect(new URL(failureReturnTo, requestUrl.origin), {
        status: 302,
      });
    }
  }

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

    const response = NextResponse.redirect(new URL(redirectLocation, requestUrl.origin), {
      status: 302,
    });
    appendSetCookieHeaders(connectResponse.headers, response.headers);

    return response;
  }

  const connectError = await readConnectStartError(connectResponse);
  const flowState = classifyGoogleConnectStartFailure({
    status: connectError.status,
    errorCode: connectError.errorCode,
    errorMessage: connectError.errorMessage,
  });
  const errorCode = normalizeErrorCode(connectError.errorCode) ?? `http_${connectError.status}`;
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
    status: connectError.status,
    flowState,
    errorCode,
    errorDetail,
    via: "fetch-fallback",
  });

  const response = NextResponse.redirect(new URL(failureReturnTo, requestUrl.origin), {
    status: 302,
  });
  appendSetCookieHeaders(connectResponse.headers, response.headers);

  return response;
}
