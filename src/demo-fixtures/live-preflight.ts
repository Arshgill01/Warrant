import {
  executeSendEmail,
  prepareGmailDraft,
  readCalendarAvailability,
} from "@/actions";
import { getAuthSessionSnapshot } from "@/auth/session";
import type {
  AuthSessionSnapshot,
  DemoLivePreflightCheck,
  DemoLivePreflightMode,
  DemoLivePreflightSnapshot,
  ProviderActionResult,
  ProviderConnectionSnapshot,
} from "@/contracts";
import { getGoogleConnectionSnapshot } from "@/connections/google";
import { authShellProviderRequests } from "@/demo-fixtures/auth-shell";
import { getRuntimeModelStartupValidation } from "@/agents/runtime";

const DEFAULT_PREFLIGHT_MODE: DemoLivePreflightMode = "token-only";

function nowIsoString(): string {
  return new Date().toISOString();
}

export function resolveDemoLivePreflightMode(
  value: string | null | undefined,
): DemoLivePreflightMode {
  if (value === "live" || value === "token-only") {
    return value;
  }

  return DEFAULT_PREFLIGHT_MODE;
}

function blockedPrerequisiteCheck(input: {
  id: DemoLivePreflightCheck["id"];
  label: string;
  detail: string;
}): DemoLivePreflightCheck {
  return {
    id: input.id,
    label: input.label,
    state: "blocked",
    headline: "Prerequisites are not ready yet.",
    detail: input.detail,
  };
}

function mapProviderResultToCheck(input: {
  id: DemoLivePreflightCheck["id"];
  label: string;
  successHeadline: string;
  successDetail: string;
  result: ProviderActionResult;
}): DemoLivePreflightCheck {
  if (input.result.state === "success") {
    return {
      id: input.id,
      label: input.label,
      state: "ready",
      headline: input.successHeadline,
      detail: input.successDetail,
    };
  }

  return {
    id: input.id,
    label: input.label,
    state: input.result.state === "failed" ? "error" : "blocked",
    headline: input.result.headline,
    detail: input.result.detail,
  };
}

function evaluateOverallState(
  checks: DemoLivePreflightCheck[],
): DemoLivePreflightSnapshot["overallState"] {
  if (checks.some((check) => check.state === "error")) {
    return "error";
  }

  if (checks.every((check) => check.state === "ready")) {
    return "ready";
  }

  return "blocked";
}

function buildSummary(overallState: DemoLivePreflightSnapshot["overallState"]): string {
  switch (overallState) {
    case "ready":
      return "Live Auth0 + Google readiness checks passed.";
    case "error":
      return "Live preflight encountered an execution error. Inspect failing checks.";
    case "blocked":
    default:
      return "Live preflight is blocked by missing, expired, or unavailable prerequisites.";
  }
}

function createCalendarReadFetchStub(): typeof fetch {
  return async (input) => {
    const requestUrl = typeof input === "string" ? input : input.url;

    if (!requestUrl.includes("googleapis.com/calendar")) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Unexpected endpoint for calendar preflight stub.",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        summary: "Primary",
        timeZone: authShellProviderRequests.calendarAvailability.timeZone,
        items: [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  };
}

function createGmailDraftFetchStub(): typeof fetch {
  return async (input) => {
    const requestUrl = typeof input === "string" ? input : input.url;

    if (!requestUrl.includes("gmail.googleapis.com/gmail/v1/users/me/drafts")) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Unexpected endpoint for Gmail draft preflight stub.",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        id: "preflight-draft-simulated",
        message: {
          id: "preflight-message-simulated",
          threadId: "preflight-thread-simulated",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  };
}

interface RunDemoLivePreflightInput {
  mode?: DemoLivePreflightMode;
  checkedAt?: string;
}

export async function runDemoLivePreflight(
  input: RunDemoLivePreflightInput = {},
): Promise<DemoLivePreflightSnapshot> {
  const checkedAt = input.checkedAt ?? nowIsoString();
  const mode = input.mode ?? DEFAULT_PREFLIGHT_MODE;
  const checks: DemoLivePreflightCheck[] = [];

  const runtimeModelStartup = getRuntimeModelStartupValidation();
  checks.push({
    id: "runtime_model_config",
    label: "Runtime model configuration",
    state: runtimeModelStartup.ok ? "ready" : "blocked",
    headline: runtimeModelStartup.ok
      ? "Gemma runtime model config is valid."
      : "Gemma runtime model config is invalid.",
    detail: runtimeModelStartup.ok
      ? `Logical model ${runtimeModelStartup.configuration.logicalModel} maps to provider id ${runtimeModelStartup.configuration.providerModelId}.`
      : runtimeModelStartup.issues
        .map((issue) => `${issue.field}: ${issue.message}`)
        .join(" | "),
  });

  const session = await getAuthSessionSnapshot();
  checks.push({
    id: "auth0_session",
    label: "Auth0 session",
    state: session.state === "signed-in" ? "ready" : "blocked",
    headline: session.headline,
    detail: session.detail,
  });

  let connection: ProviderConnectionSnapshot | null = null;
  if (session.state === "signed-in") {
    connection = await getGoogleConnectionSnapshot(session);
    checks.push({
      id: "google_connection",
      label: "Google connected-account path",
      state: connection.state === "connected" ? "ready" : "blocked",
      headline: connection.headline,
      detail: connection.detail,
    });
  } else {
    checks.push(
      blockedPrerequisiteCheck({
        id: "google_connection",
        label: "Google connected-account path",
        detail:
          "Google delegated access cannot be evaluated before an active Auth0 session is present.",
      }),
    );
  }

  const canRunProviderChecks =
    session.state === "signed-in" && connection?.state === "connected";

  if (!canRunProviderChecks || !connection) {
    checks.push(
      blockedPrerequisiteCheck({
        id: "calendar_read_path",
        label: "Calendar read provider path",
        detail:
          "Calendar provider readiness requires a signed-in Auth0 session and connected Google delegated access.",
      }),
      blockedPrerequisiteCheck({
        id: "gmail_draft_path",
        label: "Gmail draft provider path",
        detail:
          "Gmail draft readiness requires a signed-in Auth0 session and connected Google delegated access.",
      }),
      blockedPrerequisiteCheck({
        id: "gmail_send_gate",
        label: "Gmail send execution gate",
        detail:
          "Send gate verification runs after Auth0 session and connected Google delegated access are confirmed.",
      }),
    );
  } else {
    const calendarResult = await readCalendarAvailability(
      authShellProviderRequests.calendarAvailability,
      {
        session,
        connection,
        fetchFn: mode === "token-only" ? createCalendarReadFetchStub() : undefined,
      },
    );
    checks.push(
      mapProviderResultToCheck({
        id: "calendar_read_path",
        label: "Calendar read provider path",
        result: calendarResult,
        successHeadline:
          mode === "live"
            ? "Calendar provider path is live-ready."
            : "Calendar provider path is token-ready (stubbed provider call).",
        successDetail:
          mode === "live"
            ? "Calendar read succeeded through Auth0-backed delegated Google access."
            : "Auth0 delegated token flow and calendar wrapper path are ready; provider response was stubbed to avoid external dependency in token-only mode.",
      }),
    );

    const draftResult = await prepareGmailDraft(authShellProviderRequests.gmailDraft, {
      session,
      connection,
      fetchFn: mode === "token-only" ? createGmailDraftFetchStub() : undefined,
    });
    checks.push(
      mapProviderResultToCheck({
        id: "gmail_draft_path",
        label: "Gmail draft provider path",
        result: draftResult,
        successHeadline:
          mode === "live"
            ? "Gmail draft provider path is live-ready."
            : "Gmail draft provider path is token-ready (stubbed provider call).",
        successDetail:
          mode === "live"
            ? "Gmail draft preparation succeeded through Auth0-backed delegated Google access."
            : "Auth0 delegated token flow and Gmail draft wrapper path are ready; provider response was stubbed to avoid creating live drafts in token-only mode.",
      }),
    );

    const sendGateResult = await executeSendEmail(authShellProviderRequests.gmailSend, {
      session,
      connection,
    });
    const sendGateReady =
      sendGateResult.state === "execution-blocked" &&
      sendGateResult.failure?.code === "execution-release-required";
    checks.push({
      id: "gmail_send_gate",
      label: "Gmail send execution gate",
      state: sendGateReady ? "ready" : sendGateResult.state === "failed" ? "error" : "blocked",
      headline: sendGateReady
        ? "Send remains correctly gated without explicit release."
        : sendGateResult.headline,
      detail: sendGateReady
        ? "The provider send path stays blocked until an explicit execution release is supplied by an approval/control layer."
        : sendGateResult.detail,
    });
  }

  const overallState = evaluateOverallState(checks);

  return {
    mode,
    checkedAt,
    overallState,
    summary: buildSummary(overallState),
    checks,
    fatalError: null,
  };
}

export function createLivePreflightErrorSnapshot(input: {
  mode: DemoLivePreflightMode;
  message: string;
  code?: string;
  checkedAt?: string;
}): DemoLivePreflightSnapshot {
  return {
    mode: input.mode,
    checkedAt: input.checkedAt ?? nowIsoString(),
    overallState: "error",
    summary: "Live preflight failed unexpectedly before checks completed.",
    checks: [],
    fatalError: {
      code: input.code ?? "live-preflight-failed",
      message: input.message,
    },
  };
}
