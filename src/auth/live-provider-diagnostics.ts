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
    sdkErrorCode: null,
    sdkErrorMessage: null,
    oauthErrorCode: null,
    oauthErrorMessage: null,
    note,
  };
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

    return {
      attempted: true,
      outcome,
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
