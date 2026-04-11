export type GoogleConnectFlowState =
  | "not-started"
  | "started"
  | "bootstrap-token-failure"
  | "tenant-config-issue"
  | "callback-redirect-issue";

export interface GoogleConnectFlowContext {
  state: GoogleConnectFlowState;
  attemptId: string | null;
  checkedAt: string | null;
  errorCode: string | null;
  errorDetail: string | null;
  source: "none" | "query";
}

export const googleConnectFlowQueryKeys = {
  flow: "googleConnectFlow",
  attempt: "googleConnectAttempt",
  checkedAt: "googleConnectAt",
  errorCode: "googleConnectCode",
  errorDetail: "googleConnectDetail",
} as const;

export function normalizeReturnToPath(value: string | null | undefined): string {
  const normalized = value?.trim();

  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return "/";
  }

  return normalized;
}

export function buildGoogleConnectStartHref(returnTo = "/"): string {
  const searchParams = new URLSearchParams({
    returnTo: normalizeReturnToPath(returnTo),
  });

  return `/api/connect/google?${searchParams.toString()}`;
}

function readParam(
  searchParams: URLSearchParams,
  key: string,
): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value : null;
}

function isGoogleConnectFlowState(value: string | null): value is GoogleConnectFlowState {
  return (
    value === "not-started" ||
    value === "started" ||
    value === "bootstrap-token-failure" ||
    value === "tenant-config-issue" ||
    value === "callback-redirect-issue"
  );
}

function sanitizeCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9._:-]{1,100}$/.test(normalized) ? normalized : null;
}

function sanitizeDetail(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 240);
}

function classifyCallbackErrorState(input: {
  errorCode: string | null;
  errorDescription: string | null;
}): GoogleConnectFlowState | null {
  const combined = `${input.errorCode ?? ""} ${input.errorDescription ?? ""}`.toLowerCase();

  if (!combined.trim()) {
    return null;
  }

  if (
    combined.includes("callback") ||
    combined.includes("redirect") ||
    combined.includes("returnto")
  ) {
    return "callback-redirect-issue";
  }

  return "tenant-config-issue";
}

function searchParamsFromRecord(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(record).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, entry));
      return;
    }

    if (typeof value === "string") {
      searchParams.set(key, value);
    }
  });

  return searchParams;
}

export function readGoogleConnectFlowContext(
  value:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): GoogleConnectFlowContext {
  if (!value) {
    return {
      state: "not-started",
      attemptId: null,
      checkedAt: null,
      errorCode: null,
      errorDetail: null,
      source: "none",
    };
  }

  const searchParams = value instanceof URLSearchParams
    ? value
    : searchParamsFromRecord(value);
  const explicitFlow = readParam(searchParams, googleConnectFlowQueryKeys.flow);
  const callbackErrorCode = sanitizeCode(readParam(searchParams, "error"));
  const callbackErrorDescription = sanitizeDetail(readParam(searchParams, "error_description"));
  const callbackState = classifyCallbackErrorState({
    errorCode: callbackErrorCode,
    errorDescription: callbackErrorDescription,
  });
  const resolvedState = isGoogleConnectFlowState(explicitFlow)
    ? explicitFlow
    : callbackState;

  return {
    state: resolvedState ?? "not-started",
    attemptId: readParam(searchParams, googleConnectFlowQueryKeys.attempt),
    checkedAt: readParam(searchParams, googleConnectFlowQueryKeys.checkedAt),
    errorCode:
      sanitizeCode(readParam(searchParams, googleConnectFlowQueryKeys.errorCode)) ??
      callbackErrorCode,
    errorDetail:
      sanitizeDetail(readParam(searchParams, googleConnectFlowQueryKeys.errorDetail)) ??
      callbackErrorDescription,
    source: resolvedState ? "query" : "none",
  };
}

export function appendGoogleConnectFlowContext(
  returnTo: string,
  context: {
    state: GoogleConnectFlowState;
    attemptId?: string | null;
    checkedAt?: string | null;
    errorCode?: string | null;
    errorDetail?: string | null;
  },
): string {
  const resolvedReturnTo = normalizeReturnToPath(returnTo);
  const returnUrl = new URL(resolvedReturnTo, "http://localhost");

  returnUrl.searchParams.set(googleConnectFlowQueryKeys.flow, context.state);

  if (context.attemptId) {
    returnUrl.searchParams.set(googleConnectFlowQueryKeys.attempt, context.attemptId);
  }

  if (context.checkedAt) {
    returnUrl.searchParams.set(googleConnectFlowQueryKeys.checkedAt, context.checkedAt);
  }

  const code = sanitizeCode(context.errorCode ?? null);
  if (code) {
    returnUrl.searchParams.set(googleConnectFlowQueryKeys.errorCode, code);
  }

  const detail = sanitizeDetail(context.errorDetail ?? null);
  if (detail) {
    returnUrl.searchParams.set(googleConnectFlowQueryKeys.errorDetail, detail);
  }

  return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
}

export function classifyGoogleConnectStartFailure(input: {
  status: number;
  errorCode: string | null;
  errorMessage: string | null;
}): GoogleConnectFlowState {
  const combined = `${input.errorCode ?? ""} ${input.errorMessage ?? ""}`.toLowerCase();

  if (
    combined.includes("callback") ||
    combined.includes("redirect") ||
    combined.includes("returnto")
  ) {
    return "callback-redirect-issue";
  }

  if (
    input.status === 401 &&
    combined.includes("connected account access token")
  ) {
    return "bootstrap-token-failure";
  }

  if (
    input.status === 400 ||
    input.status === 403 ||
    input.status === 404 ||
    input.status === 422 ||
    input.status === 429 ||
    input.status === 503 ||
    input.status >= 500 ||
    combined.includes("failed_to_initiate") ||
    combined.includes("initiate the connect account flow") ||
    combined.includes("my account api") ||
    combined.includes("configuration") ||
    combined.includes("setup") ||
    combined.includes("tenant") ||
    combined.includes("connected account")
  ) {
    return "tenant-config-issue";
  }

  return "tenant-config-issue";
}
