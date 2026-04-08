import {
  executeSendEmail,
  prepareGmailDraft,
  readCalendarAvailability,
} from "@/actions";
import { getAuthSessionSnapshot } from "@/auth/session";
import { logLiveProviderDiagnostic } from "@/auth/live-provider-diagnostics";
import { getGoogleConnectionSnapshotWithToken } from "@/connections/google";
import type {
  DemoLivePreflightCheck,
  DemoLivePreflightMode,
  DemoLivePreflightSnapshot,
  ProviderActionResult,
  ProviderConnectionSnapshot,
} from "@/contracts";
import { authShellProviderRequests } from "@/demo-fixtures/auth-shell";
import { getRuntimeModelStartupValidation } from "@/agents/runtime";

const DEFAULT_PREFLIGHT_MODE: DemoLivePreflightMode = "token-only";

const LIVE_REQUIRED_CHECKS = new Set<DemoLivePreflightCheck["id"]>([
  "runtime_model_readiness",
  "auth0_session_readiness",
  "connected_account_bootstrap",
  "delegated_google_access",
  "calendar_provider_readiness",
  "gmail_draft_readiness",
  "gmail_send_readiness",
]);

const TOKEN_ONLY_REQUIRED_CHECKS = new Set<DemoLivePreflightCheck["id"]>([
  "runtime_model_readiness",
]);

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

function createCheck(input: DemoLivePreflightCheck): DemoLivePreflightCheck {
  return input;
}

function blockedCheck(input: {
  id: DemoLivePreflightCheck["id"];
  label: string;
  headline: string;
  detail: string;
  diagnostics?: string[];
}): DemoLivePreflightCheck {
  return createCheck({
    id: input.id,
    label: input.label,
    state: "blocked",
    headline: input.headline,
    detail: input.detail,
    diagnostics: input.diagnostics,
  });
}

function skippedCheck(input: {
  id: DemoLivePreflightCheck["id"];
  label: string;
  headline: string;
  detail: string;
  diagnostics?: string[];
}): DemoLivePreflightCheck {
  return createCheck({
    id: input.id,
    label: input.label,
    state: "skipped",
    headline: input.headline,
    detail: input.detail,
    diagnostics: input.diagnostics,
  });
}

function mapProviderResultToCheck(input: {
  id: DemoLivePreflightCheck["id"];
  label: string;
  successHeadline: string;
  successDetail: string;
  result: ProviderActionResult;
}): DemoLivePreflightCheck {
  if (input.result.state === "success") {
    return createCheck({
      id: input.id,
      label: input.label,
      state: "ready",
      headline: input.successHeadline,
      detail: input.successDetail,
      diagnostics: summarizeProviderResultDiagnostics(input.result),
    });
  }

  return createCheck({
    id: input.id,
    label: input.label,
    state: input.result.state === "failed" ? "error" : "blocked",
    headline: input.result.headline,
    detail: input.result.detail,
    diagnostics: summarizeProviderResultDiagnostics(input.result),
  });
}

function summarizeSessionDiagnostics(
  session: Awaited<ReturnType<typeof getAuthSessionSnapshot>>,
): string[] {
  if (!session.diagnostics) {
    return [];
  }

  return [
    `session_state=${session.state}`,
    `auth0_configured=${String(session.diagnostics.auth0Configured)}`,
    `auth0_client_ready=${String(session.diagnostics.auth0ClientReady)}`,
    `has_session=${String(session.diagnostics.hasSession)}`,
    `has_refresh_token=${session.diagnostics.hasRefreshToken === null ? "unknown" : String(session.diagnostics.hasRefreshToken)}`,
    session.diagnostics.environmentIssues.length
      ? `environment_issues=${session.diagnostics.environmentIssues.join("|")}`
      : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function summarizeConnectionDiagnostics(connection: ProviderConnectionSnapshot): string[] {
  const diagnostics = connection.diagnostics;

  if (!diagnostics) {
    return [];
  }

  return [
    `connection_name=${diagnostics.connectionName}`,
    `connect_href=${diagnostics.connectHref ?? "n/a"}`,
    `account_label_source=${diagnostics.accountLabelSource}`,
    `bootstrap_attempted=${String(diagnostics.bootstrap.attempted)}`,
    `bootstrap_outcome=${diagnostics.bootstrap.outcome}`,
    diagnostics.bootstrap.note ? `bootstrap_note=${diagnostics.bootstrap.note}` : null,
    `token_exchange_attempted=${String(diagnostics.tokenExchange.attempted)}`,
    `token_exchange_outcome=${diagnostics.tokenExchange.outcome}`,
    `token_exchange_failure_edge=${diagnostics.tokenExchange.failureEdge}`,
    diagnostics.tokenExchange.sdkErrorCode
      ? `token_exchange_auth0_code=${diagnostics.tokenExchange.sdkErrorCode}`
      : null,
    diagnostics.tokenExchange.oauthErrorCode
      ? `token_exchange_oauth_code=${diagnostics.tokenExchange.oauthErrorCode}`
      : null,
    diagnostics.tokenExchange.oauthErrorMessage
      ? `token_exchange_oauth_message=${diagnostics.tokenExchange.oauthErrorMessage}`
      : null,
    diagnostics.tokenExchange.note
      ? `token_exchange_note=${diagnostics.tokenExchange.note}`
      : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function summarizeProviderResultDiagnostics(result: ProviderActionResult): string[] {
  return [
    `provider_state=${result.state}`,
    result.failure?.code ? `provider_failure_code=${result.failure.code}` : null,
    result.failure?.retryable !== undefined
      ? `provider_failure_retryable=${String(result.failure.retryable)}`
      : null,
    `connection_state=${result.connection.state}`,
    ...summarizeConnectionDiagnostics(result.connection),
  ].filter((entry): entry is string => Boolean(entry));
}

function evaluateOverallState(
  mode: DemoLivePreflightMode,
  checks: DemoLivePreflightCheck[],
): DemoLivePreflightSnapshot["overallState"] {
  const requiredIds =
    mode === "live" ? LIVE_REQUIRED_CHECKS : TOKEN_ONLY_REQUIRED_CHECKS;
  const requiredChecks = checks.filter((check) => requiredIds.has(check.id));

  if (requiredChecks.length !== requiredIds.size) {
    return "blocked";
  }

  if (requiredChecks.some((check) => check.state === "error")) {
    return "error";
  }

  if (requiredChecks.every((check) => check.state === "ready")) {
    return "ready";
  }

  return "blocked";
}

function buildSummary(
  mode: DemoLivePreflightMode,
  overallState: DemoLivePreflightSnapshot["overallState"],
): string {
  if (mode === "token-only") {
    switch (overallState) {
      case "ready":
        return "Token-only preflight passed: runtime/model lane is ready.";
      case "error":
        return "Token-only preflight hit a runtime/model execution error.";
      case "blocked":
      default:
        return "Token-only preflight is blocked by runtime/model readiness.";
    }
  }

  switch (overallState) {
    case "ready":
      return "Live provider preflight passed: Auth0 + Google delegated path is ready.";
    case "error":
      return "Live provider preflight encountered an execution error. Inspect failing checks.";
    case "blocked":
    default:
      return "Live provider preflight is blocked by unresolved Auth0, delegated-access, or provider prerequisites.";
  }
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

  logLiveProviderDiagnostic("preflight.run.start", {
    mode,
    checkedAt,
  });

  const runtimeModelStartup = getRuntimeModelStartupValidation();
  checks.push(
    createCheck({
      id: "runtime_model_readiness",
      label: "Runtime model readiness",
      state: runtimeModelStartup.ok ? "ready" : "blocked",
      headline: runtimeModelStartup.ok
        ? "Runtime model configuration is valid."
        : "Runtime model configuration is invalid.",
      detail: runtimeModelStartup.ok
        ? `Logical model ${runtimeModelStartup.configuration.logicalModel} maps to provider id ${runtimeModelStartup.configuration.providerModelId}.`
        : runtimeModelStartup.issues
            .map((issue) => `${issue.field}: ${issue.message}`)
            .join(" | "),
      diagnostics: [
        `logical_model=${runtimeModelStartup.configuration.logicalModel}`,
        `provider_model_id=${runtimeModelStartup.configuration.providerModelId}`,
        `runtime_provider=${runtimeModelStartup.configuration.provider}`,
        `runtime_config_valid=${String(runtimeModelStartup.ok)}`,
      ],
    }),
  );

  const session = await getAuthSessionSnapshot();

  if (mode === "token-only") {
    const tokenOnlySessionDiagnostics = summarizeSessionDiagnostics(session);
    checks.push(
      skippedCheck({
        id: "auth0_session_readiness",
        label: "Auth0 session readiness",
        headline: "Skipped in token-only mode.",
        detail:
          "Token-only mode validates the live runtime/model lane and does not gate on Auth0 session state.",
        diagnostics: tokenOnlySessionDiagnostics,
      }),
      skippedCheck({
        id: "connected_account_bootstrap",
        label: "Connected-account bootstrap readiness",
        headline: "Skipped in token-only mode.",
        detail:
          "Connected-account bootstrap checks run only in live-provider mode because they are Google/Auth0 provider prerequisites.",
        diagnostics: tokenOnlySessionDiagnostics,
      }),
      skippedCheck({
        id: "delegated_google_access",
        label: "Delegated Google access readiness",
        headline: "Skipped in token-only mode.",
        detail:
          "Delegated Google token exchange checks run only in live-provider mode.",
      }),
      skippedCheck({
        id: "calendar_provider_readiness",
        label: "Calendar provider readiness",
        headline: "Skipped in token-only mode.",
        detail:
          "Calendar provider probes are skipped in token-only mode to keep runtime/model readiness independent from Google provider state.",
      }),
      skippedCheck({
        id: "gmail_draft_readiness",
        label: "Gmail draft readiness",
        headline: "Skipped in token-only mode.",
        detail:
          "Gmail draft provider probes are skipped in token-only mode to avoid unrelated provider gating.",
      }),
      skippedCheck({
        id: "gmail_send_readiness",
        label: "Gmail send readiness",
        headline: "Skipped in token-only mode.",
        detail:
          "Gmail send gate/provider checks are skipped in token-only mode.",
      }),
    );
  } else {
    checks.push(
      createCheck({
        id: "auth0_session_readiness",
        label: "Auth0 session readiness",
        state: session.state === "signed-in" ? "ready" : "blocked",
        headline: session.headline,
        detail: session.detail,
        diagnostics: summarizeSessionDiagnostics(session),
      }),
    );

    const bootstrapDiagnostics = summarizeSessionDiagnostics(session);
    const bootstrapReady =
      session.state === "signed-in" &&
      session.diagnostics?.hasRefreshToken !== false;

    if (!bootstrapReady) {
      checks.push(
        blockedCheck({
          id: "connected_account_bootstrap",
          label: "Connected-account bootstrap readiness",
          headline:
            session.state !== "signed-in"
              ? "Connected-account bootstrap is blocked: no signed-in Auth0 session."
              : "Connected-account bootstrap is blocked: session refresh token is missing.",
          detail:
            session.state !== "signed-in"
              ? "Auth0 must establish an active signed-in session before connected-account bootstrap can run."
              : "Auth0 needs a session refresh token to mint the bootstrap token used before Google handoff.",
          diagnostics: bootstrapDiagnostics,
        }),
      );

      checks.push(
        blockedCheck({
          id: "delegated_google_access",
          label: "Delegated Google access readiness",
          headline:
            "Delegated Google access check was skipped because bootstrap prerequisites are blocked.",
          detail:
            "Fix Auth0 session/bootstrap readiness first, then retry delegated token exchange checks.",
          diagnostics: [
            ...bootstrapDiagnostics,
            "delegated_access_evaluation=skipped_bootstrap_not_ready",
          ],
        }),
      );
    } else {
      checks.push(
        createCheck({
          id: "connected_account_bootstrap",
          label: "Connected-account bootstrap readiness",
          state: "ready",
          headline:
            "Connected-account bootstrap prerequisites are ready.",
          detail:
            "Auth0 session state and refresh-token prerequisites allow the connected-account bootstrap stage to run.",
          diagnostics: bootstrapDiagnostics,
        }),
      );
    }

    let delegatedConnection: ProviderConnectionSnapshot | null = null;
    let delegatedAccessToken: string | null = null;
    let delegatedReady = false;

    if (bootstrapReady) {
      const delegatedAccess = await getGoogleConnectionSnapshotWithToken(session);
      delegatedConnection = delegatedAccess.snapshot;
      delegatedAccessToken = delegatedAccess.delegatedAccessToken;
      delegatedReady =
        delegatedAccess.snapshot.state === "connected" &&
        Boolean(delegatedAccess.delegatedAccessToken);

      checks.push(
        createCheck({
          id: "delegated_google_access",
          label: "Delegated Google access readiness",
          state: delegatedReady ? "ready" : "blocked",
          headline: delegatedAccess.snapshot.headline,
          detail: delegatedAccess.snapshot.detail,
          diagnostics: summarizeConnectionDiagnostics(delegatedAccess.snapshot),
        }),
      );
    }

    if (!delegatedReady || !delegatedConnection || !delegatedAccessToken) {
      const delegatedDiagnostics = delegatedConnection
        ? summarizeConnectionDiagnostics(delegatedConnection)
        : ["delegated_access_state=not_ready"];

      checks.push(
        blockedCheck({
          id: "calendar_provider_readiness",
          label: "Calendar provider readiness",
          headline:
            "Calendar provider readiness is blocked by delegated-access prerequisites.",
          detail:
            "Calendar provider probes run only after delegated Google access is truly ready.",
          diagnostics: delegatedDiagnostics,
        }),
        blockedCheck({
          id: "gmail_draft_readiness",
          label: "Gmail draft readiness",
          headline:
            "Gmail draft readiness is blocked by delegated-access prerequisites.",
          detail:
            "Gmail draft provider probes run only after delegated Google access is truly ready.",
          diagnostics: delegatedDiagnostics,
        }),
        blockedCheck({
          id: "gmail_send_readiness",
          label: "Gmail send readiness",
          headline:
            "Gmail send readiness is blocked by delegated-access prerequisites.",
          detail:
            "Gmail send gate checks run only after delegated Google access is truly ready.",
          diagnostics: delegatedDiagnostics,
        }),
      );
    } else {
      const calendarResult = await readCalendarAvailability(
        authShellProviderRequests.calendarAvailability,
        {
          session,
          connection: delegatedConnection,
          accessToken: delegatedAccessToken,
        },
      );
      checks.push(
        mapProviderResultToCheck({
          id: "calendar_provider_readiness",
          label: "Calendar provider readiness",
          result: calendarResult,
          successHeadline: "Calendar provider path is live-ready.",
          successDetail:
            "Calendar read succeeded through Auth0-backed delegated Google access.",
        }),
      );

      const draftResult = await prepareGmailDraft(authShellProviderRequests.gmailDraft, {
        session,
        connection: delegatedConnection,
        accessToken: delegatedAccessToken,
      });
      checks.push(
        mapProviderResultToCheck({
          id: "gmail_draft_readiness",
          label: "Gmail draft readiness",
          result: draftResult,
          successHeadline: "Gmail draft provider path is live-ready.",
          successDetail:
            "Gmail draft preparation succeeded through Auth0-backed delegated Google access.",
        }),
      );

      const sendGateResult = await executeSendEmail(authShellProviderRequests.gmailSend, {
        session,
        connection: delegatedConnection,
      });
      const sendGateReady =
        sendGateResult.state === "execution-blocked" &&
        sendGateResult.failure?.code === "execution-release-required";
      checks.push(
        createCheck({
          id: "gmail_send_readiness",
          label: "Gmail send readiness",
          state: sendGateReady
            ? "ready"
            : sendGateResult.state === "failed"
              ? "error"
              : "blocked",
          headline: sendGateReady
            ? "Send stays correctly gated until explicit release."
            : sendGateResult.headline,
          detail: sendGateReady
            ? "The live send path is available but remains blocked until an explicit execution release is supplied by approval/control."
            : sendGateResult.detail,
          diagnostics: [
            `provider_state=${sendGateResult.state}`,
            sendGateResult.failure?.code ? `provider_failure_code=${sendGateResult.failure.code}` : null,
            `connection_state=${sendGateResult.connection.state}`,
            ...summarizeConnectionDiagnostics(sendGateResult.connection),
          ].filter((entry): entry is string => Boolean(entry)),
        }),
      );
    }
  }

  const overallState = evaluateOverallState(mode, checks);
  logLiveProviderDiagnostic("preflight.run.complete", {
    mode,
    checkedAt,
    overallState,
    checks: checks.map((check) => ({
      id: check.id,
      state: check.state,
    })),
  });

  return {
    mode,
    checkedAt,
    overallState,
    summary: buildSummary(mode, overallState),
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
