import {
  AccessTokenForConnectionError,
  AccessTokenForConnectionErrorCode,
} from "@auth0/nextjs-auth0/errors";
import type { ProviderConnectionTokenExchangeDiagnostics } from "@/contracts";

function nowIsoString(): string {
  return new Date().toISOString();
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function serializePayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, (_key, value) => (value === undefined ? null : value));
}

export function logLiveProviderDiagnostic(
  event: string,
  payload: Record<string, unknown>,
): void {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.WARRANT_LIVE_PROVIDER_DIAGNOSTICS !== "true"
  ) {
    return;
  }

  if (process.env.WARRANT_LIVE_PROVIDER_DIAGNOSTICS === "false") {
    return;
  }

  const prefixedPayload = {
    checkedAt: nowIsoString(),
    event,
    ...payload,
  };

  try {
    // Keep diagnostics explicit and machine-readable for local triage.
    console.info(`[live-provider] ${serializePayload(prefixedPayload)}`);
  } catch {
    console.info(
      `[live-provider] {"checkedAt":"${nowIsoString()}","event":"${event}","serializationError":true}`,
    );
  }
}

export function createTokenExchangeNotAttemptedDiagnostics(
  note: string,
): ProviderConnectionTokenExchangeDiagnostics {
  return {
    attempted: false,
    outcome: "not-attempted",
    failureEdge: "none",
    sdkErrorCode: null,
    sdkErrorMessage: null,
    oauthErrorCode: null,
    oauthErrorMessage: null,
    note,
  };
}

export function createTokenExchangeSuccessDiagnostics(
  note: string,
): ProviderConnectionTokenExchangeDiagnostics {
  return {
    attempted: true,
    outcome: "success",
    failureEdge: "none",
    sdkErrorCode: null,
    sdkErrorMessage: null,
    oauthErrorCode: null,
    oauthErrorMessage: null,
    note,
  };
}

function inferFailedExchangeEdge(input: {
  sdkErrorMessage: string | null;
  oauthErrorCode: string | null;
  oauthErrorMessage: string | null;
}): ProviderConnectionTokenExchangeDiagnostics["failureEdge"] {
  const haystack = [
    input.sdkErrorMessage,
    input.oauthErrorCode,
    input.oauthErrorMessage,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (
    haystack.includes("connected account access token") ||
    haystack.includes("create:me:connected_accounts")
  ) {
    return "bootstrap-token";
  }

  if (haystack.length > 0) {
    return "delegated-token-exchange";
  }

  return "unknown";
}

export function createTokenExchangeErrorDiagnostics(
  error: unknown,
): ProviderConnectionTokenExchangeDiagnostics {
  const errorRecord = readRecord(error);

  if (error instanceof AccessTokenForConnectionError) {
    const cause = readRecord(error.cause);
    const oauthErrorCode = readString(cause?.code) ?? readString(cause?.error);
    const oauthErrorMessage =
      readString(cause?.message) ?? readString(cause?.error_description);

    const outcome: ProviderConnectionTokenExchangeDiagnostics["outcome"] =
      error.code === AccessTokenForConnectionErrorCode.MISSING_SESSION
        ? "missing-session"
        : error.code === AccessTokenForConnectionErrorCode.MISSING_REFRESH_TOKEN
          ? "missing-refresh-token"
          : error.code === AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE
            ? "failed-to-exchange"
            : "unexpected-error";

    const failureEdge: ProviderConnectionTokenExchangeDiagnostics["failureEdge"] =
      error.code === AccessTokenForConnectionErrorCode.MISSING_SESSION ||
      error.code === AccessTokenForConnectionErrorCode.MISSING_REFRESH_TOKEN
        ? "bootstrap-token"
        : error.code === AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE
          ? inferFailedExchangeEdge({
              sdkErrorMessage: error.message,
              oauthErrorCode,
              oauthErrorMessage,
            })
          : "unknown";

    return {
      attempted: true,
      outcome,
      failureEdge,
      sdkErrorCode: error.code,
      sdkErrorMessage: error.message,
      oauthErrorCode,
      oauthErrorMessage,
      note: null,
    };
  }

  return {
    attempted: true,
    outcome: "unexpected-error",
    failureEdge: "unknown",
    sdkErrorCode: readString(errorRecord?.code),
    sdkErrorMessage: readString(errorRecord?.message) ?? "Unexpected token exchange failure.",
    oauthErrorCode: null,
    oauthErrorMessage: null,
    note: null,
  };
}

export function formatTokenExchangeDiagnostics(
  diagnostics: ProviderConnectionTokenExchangeDiagnostics,
): string {
  const details = [
    diagnostics.failureEdge !== "none"
      ? `failure_edge=${diagnostics.failureEdge}`
      : null,
    diagnostics.sdkErrorCode
      ? `auth0_code=${diagnostics.sdkErrorCode}`
      : null,
    diagnostics.oauthErrorCode
      ? `oauth_code=${diagnostics.oauthErrorCode}`
      : null,
    diagnostics.oauthErrorMessage
      ? `oauth_message=${diagnostics.oauthErrorMessage}`
      : null,
    diagnostics.note ? `note=${diagnostics.note}` : null,
  ].filter((value): value is string => Boolean(value));

  if (!details.length) {
    return "";
  }

  return ` Diagnostics: ${details.join(" | ")}.`;
}
