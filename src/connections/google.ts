import type {
  AuthSessionSnapshot,
  ProviderConnectionBootstrapDiagnostics,
  ProviderConnectionDiagnostics,
  ProviderConnectionSetupSnapshot,
  ProviderConnectionSnapshot,
  ProviderConnectionState,
} from "@/contracts";
import { AccessTokenForConnectionError, AccessTokenForConnectionErrorCode, auth0 } from "@/auth";
import { getAuth0Environment } from "@/auth/env";
import {
  createTokenExchangeErrorDiagnostics,
  createTokenExchangeNotAttemptedDiagnostics,
  createTokenExchangeSuccessDiagnostics,
  formatTokenExchangeDiagnostics,
  logLiveProviderDiagnostic,
} from "@/auth/live-provider-diagnostics";

export const googleDelegatedScopes = [
  "openid",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
] as const;

export const googleConnectAuthorizationParams = {
  access_type: "offline",
  prompt: "consent",
} as const;

export const googleConnectionStateLegend: Array<{
  state: ProviderConnectionState;
  label: string;
  detail: string;
}> = [
  {
    state: "connected",
    label: "Connected",
    detail: "Auth0 can mint delegated Google access for Calendar reads and Gmail actions.",
  },
  {
    state: "not-connected",
    label: "Not connected",
    detail: "The user is signed in, but Google has not been linked through Auth0 yet.",
  },
  {
    state: "pending",
    label: "Pending",
    detail: "The provider handoff started, but the delegated path is not ready to use yet.",
  },
  {
    state: "expired",
    label: "Expired",
    detail: "A previous Google link exists, but Auth0 can no longer mint delegated access until the session is refreshed.",
  },
  {
    state: "unavailable",
    label: "Unavailable",
    detail: "The shell is missing config or the delegated token path cannot be used right now.",
  },
];

interface EvaluateGoogleConnectionSnapshotOptions {
  includeDelegatedAccessToken?: boolean;
}

export interface GoogleConnectionSnapshotWithToken {
  snapshot: ProviderConnectionSnapshot;
  delegatedAccessToken: string | null;
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function buildBootstrapDiagnostics(
  outcome: ProviderConnectionBootstrapDiagnostics["outcome"],
  note: string,
): ProviderConnectionBootstrapDiagnostics {
  return {
    attempted: outcome === "ready" || outcome === "missing-session" || outcome === "missing-refresh-token",
    outcome,
    note,
  };
}

function hideSessionFallbackAccountLabel(
  account: {
    label: string | null;
    source: ProviderConnectionDiagnostics["accountLabelSource"];
  },
  includeSessionFallback: boolean,
): string | null {
  if (account.source === "session-email" && !includeSessionFallback) {
    return null;
  }

  return account.label;
}

export function buildGoogleConnectHref(connectionName: string, returnTo = "/"): string {
  const searchParams = new URLSearchParams({
    connection: connectionName,
    returnTo,
    ...googleConnectAuthorizationParams,
  });

  googleDelegatedScopes.forEach((scope) => searchParams.append("scopes", scope));

  return `/auth/connect?${searchParams.toString()}`;
}

export function getGoogleConnectionSetupSnapshot(): ProviderConnectionSetupSnapshot {
  const authEnv = getAuth0Environment();

  if (!authEnv.isConfigured) {
    const issueSummary = authEnv.configurationIssues.length
      ? `Setup blockers: ${authEnv.configurationIssues.join(" | ")}.`
      : null;

    return {
      provider: "google",
      status: "setup-required",
      headline: "Google delegated access depends on Auth0 app setup first.",
      detail:
        [
          "Finish the Auth0 app env and dashboard URLs before the Google connected-account flow can hand off Calendar and Gmail access through Auth0.",
          issueSummary,
        ]
          .filter(Boolean)
          .join(" "),
      connectionName: authEnv.googleConnectionName,
      requestedScopes: [...googleDelegatedScopes],
      requestedAuthParams: Object.entries(googleConnectAuthorizationParams).map(([key, value]) => ({ key, value })),
      tokenVaultConnectionId: authEnv.tokenVaultConnectionId,
    };
  }

  return {
    provider: "google",
    status: "ready",
    headline: "Google can be linked through Auth0's connected-account flow.",
    detail:
      "The shell will send users through /auth/connect with offline Google access so later Gmail and Calendar branches can consume delegated access instead of direct provider secrets.",
    connectionName: authEnv.googleConnectionName,
    requestedScopes: [...googleDelegatedScopes],
    requestedAuthParams: Object.entries(googleConnectAuthorizationParams).map(([key, value]) => ({ key, value })),
    tokenVaultConnectionId: authEnv.tokenVaultConnectionId,
  };
}

function resolveConnectedAccountLabel(session: AuthSessionSnapshot): {
  label: string | null;
  source: ProviderConnectionDiagnostics["accountLabelSource"];
} {
  const authEnv = getAuth0Environment();

  if (authEnv.googleConnectionEmailOverride) {
    return {
      label: authEnv.googleConnectionEmailOverride,
      source: "override",
    };
  }

  if (session.user?.email) {
    return {
      label: session.user.email,
      source: "session-email",
    };
  }

  return {
    label: null,
    source: "none",
  };
}

function buildConnectionDiagnostics(input: {
  connectionName: string;
  connectHref: string | null;
  accountLabelSource: ProviderConnectionDiagnostics["accountLabelSource"];
  bootstrap: ProviderConnectionDiagnostics["bootstrap"];
  tokenExchange: ProviderConnectionDiagnostics["tokenExchange"];
}): ProviderConnectionDiagnostics {
  return {
    evaluatedAt: nowIsoString(),
    connectionName: input.connectionName,
    connectHref: input.connectHref,
    accountLabelSource: input.accountLabelSource,
    bootstrap: input.bootstrap,
    tokenExchange: input.tokenExchange,
  };
}

function logConnectionEvaluationComplete(snapshot: ProviderConnectionSnapshot): void {
  logLiveProviderDiagnostic("google.connection.evaluate.complete", {
    state: snapshot.state,
    via: snapshot.via,
    bootstrapOutcome: snapshot.diagnostics?.bootstrap.outcome ?? null,
    tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
    tokenExchangeFailureEdge: snapshot.diagnostics?.tokenExchange.failureEdge ?? null,
    tokenExchangeAttempted: snapshot.diagnostics?.tokenExchange.attempted ?? false,
  });
}

function buildOverrideSnapshot(
  state: ProviderConnectionState,
  session: AuthSessionSnapshot,
  connectHref: string,
): ProviderConnectionSnapshot {
  const authEnv = getAuth0Environment();
  const account = resolveConnectedAccountLabel(session);
  const diagnostics = buildConnectionDiagnostics({
    connectionName: authEnv.googleConnectionName,
    connectHref,
    accountLabelSource: account.source,
    bootstrap: buildBootstrapDiagnostics(
      "shell-override",
      "Shell override is active, so bootstrap/connect readiness is controlled by override state.",
    ),
    tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
      "Shell override is active, so no live token exchange was attempted.",
    ),
  });

  switch (state) {
    case "connected":
      return {
        provider: "google",
        state,
        headline: "Google is connected through Auth0.",
        detail: "The shell override marks delegated Google access as ready until the real Token Vault callback is wired.",
        actionLabel: null,
        actionHref: null,
        accountLabel: hideSessionFallbackAccountLabel(account, true),
        tokenExpiresAt: null,
        via: "shell-override",
        diagnostics,
      };
    case "pending":
      return {
        provider: "google",
        state,
        headline: "Google connection is pending.",
        detail: "Auth0 has started the provider handoff, but the delegated access path is not ready yet.",
        actionLabel: null,
        actionHref: null,
        accountLabel: hideSessionFallbackAccountLabel(account, false),
        tokenExpiresAt: null,
        via: "shell-override",
        diagnostics,
      };
    case "not-connected":
      return {
        provider: "google",
        state,
        headline: "Google is not connected yet.",
        detail: "This shell override keeps the provider disconnected until you link Google through Auth0.",
        actionLabel: session.state === "signed-in" ? "Connect Google with Auth0" : session.loginHref ? "Sign in with Auth0" : null,
        actionHref: session.state === "signed-in" ? connectHref : session.loginHref,
        accountLabel: hideSessionFallbackAccountLabel(account, false),
        tokenExpiresAt: null,
        via: "shell-override",
        diagnostics,
      };
    case "expired":
      return {
        provider: "google",
        state,
        headline: "Google delegated access expired.",
        detail: "The shell override marks the previous delegated path as expired until Auth0 re-establishes it.",
        actionLabel: session.logoutHref ? "Refresh Auth0 session" : session.loginHref ? "Sign in with Auth0" : null,
        actionHref: session.logoutHref ?? session.loginHref,
        accountLabel: hideSessionFallbackAccountLabel(account, false),
        tokenExpiresAt: null,
        via: "shell-override",
        diagnostics,
      };
    case "unavailable":
    default:
      return {
        provider: "google",
        state: "unavailable",
        headline: "Google access is unavailable.",
        detail: "The shell override leaves delegated Google access unavailable until the real Auth0 provider path is ready.",
        actionLabel: null,
        actionHref: null,
        accountLabel: hideSessionFallbackAccountLabel(account, false),
        tokenExpiresAt: null,
        via: "shell-override",
        diagnostics,
      };
  }
}

function buildAuthUnavailableSnapshot(input: {
  detail: string;
  connectionName: string;
  connectHref: string | null;
  accountLabelSource: ProviderConnectionDiagnostics["accountLabelSource"];
}): ProviderConnectionSnapshot {
  return {
    provider: "google",
    state: "unavailable",
    headline: "Google connection is unavailable.",
    detail: input.detail,
    actionLabel: null,
    actionHref: null,
    accountLabel: null,
    tokenExpiresAt: null,
    via: "missing-config",
    diagnostics: buildConnectionDiagnostics({
      connectionName: input.connectionName,
      connectHref: input.connectHref,
      accountLabelSource: input.accountLabelSource,
      bootstrap: buildBootstrapDiagnostics(
        "auth0-not-configured",
        "Auth0 config is incomplete, so connected-account bootstrap cannot run.",
      ),
      tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
        "Auth0 is not fully configured, so no token exchange attempt was made.",
      ),
    }),
  };
}

function buildSnapshot(input: {
  state: ProviderConnectionState;
  headline: string;
  detail: string;
  actionLabel: string | null;
  actionHref: string | null;
  accountLabel: string | null;
  tokenExpiresAt: string | null;
  via: ProviderConnectionSnapshot["via"];
  diagnostics: ProviderConnectionDiagnostics;
}): ProviderConnectionSnapshot {
  return {
    provider: "google",
    state: input.state,
    headline: input.headline,
    detail: input.detail,
    actionLabel: input.actionLabel,
    actionHref: input.actionHref,
    accountLabel: input.accountLabel,
    tokenExpiresAt: input.tokenExpiresAt,
    via: input.via,
    diagnostics: input.diagnostics,
  };
}

async function evaluateGoogleConnectionSnapshot(
  session: AuthSessionSnapshot,
  options: EvaluateGoogleConnectionSnapshotOptions = {},
): Promise<GoogleConnectionSnapshotWithToken> {
  const authEnv = getAuth0Environment();
  const connectHref = buildGoogleConnectHref(authEnv.googleConnectionName);
  const account = resolveConnectedAccountLabel(session);

  logLiveProviderDiagnostic("google.connection.evaluate.start", {
    sessionState: session.state,
    authConfigured: authEnv.isConfigured,
    connectionName: authEnv.googleConnectionName,
    hasConnectionOverride: Boolean(authEnv.googleConnectionStateOverride),
    connectHref,
  });

  if (authEnv.googleConnectionStateOverride) {
    const snapshot = buildOverrideSnapshot(
      authEnv.googleConnectionStateOverride,
      session,
      connectHref,
    );

    logConnectionEvaluationComplete(snapshot);

    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }

  if (!authEnv.isConfigured || !auth0) {
    const snapshot = buildAuthUnavailableSnapshot({
      detail:
        "Auth0 is not fully configured, so the shell cannot start or inspect delegated Google access yet.",
      connectionName: authEnv.googleConnectionName,
      connectHref,
      accountLabelSource: account.source,
    });

    logConnectionEvaluationComplete(snapshot);

    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }

  if (session.state !== "signed-in") {
    const snapshot = buildSnapshot({
      state: "not-connected",
      headline: "Google is not connected yet.",
      detail: "Start with Auth0 sign-in, then connect Google so Calendar and Gmail run through delegated access instead of broad app credentials.",
      actionLabel: session.loginHref ? "Sign in with Auth0" : null,
      actionHref: session.loginHref,
      accountLabel: null,
      tokenExpiresAt: null,
      via: "auth0-token-vault",
      diagnostics: buildConnectionDiagnostics({
        connectionName: authEnv.googleConnectionName,
        connectHref,
        accountLabelSource: account.source,
        bootstrap: buildBootstrapDiagnostics(
          "missing-session",
          "Connected-account bootstrap requires an active Auth0 session.",
        ),
        tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
          "Connection evaluation requires an active Auth0 session first.",
        ),
      }),
    });

    logConnectionEvaluationComplete(snapshot);

    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }

  if (session.diagnostics?.hasRefreshToken === false) {
    const snapshot = buildSnapshot({
      state: "expired",
      headline: "Auth0 session cannot bootstrap Google connect yet.",
      detail:
        "This session is missing a refresh token, so Auth0 cannot mint the bootstrap connected-account token used before Google handoff. Sign in again with offline access.",
      actionLabel: session.logoutHref ? "Refresh Auth0 session" : session.loginHref ? "Sign in with Auth0" : null,
      actionHref: session.logoutHref ?? session.loginHref,
      accountLabel: hideSessionFallbackAccountLabel(account, false),
      tokenExpiresAt: null,
      via: "auth0-token-vault",
      diagnostics: buildConnectionDiagnostics({
        connectionName: authEnv.googleConnectionName,
        connectHref,
        accountLabelSource: account.source,
        bootstrap: buildBootstrapDiagnostics(
          "missing-refresh-token",
          "Connected-account bootstrap needs a session refresh token.",
        ),
        tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
          "Token exchange was skipped because the session has no refresh token.",
        ),
      }),
    });

    logConnectionEvaluationComplete(snapshot);

    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }

  try {
    logLiveProviderDiagnostic("google.connection.token_exchange.attempt", {
      connectionName: authEnv.googleConnectionName,
      loginHintPresent: Boolean(session.user?.email),
    });

    const accessToken = await auth0.getAccessTokenForConnection({
      connection: authEnv.googleConnectionName,
      login_hint: session.user?.email ?? undefined,
    });

    const snapshot = buildSnapshot({
      state: "connected",
      headline: "Google is connected through Auth0.",
      detail: "Auth0 can mint delegated Google access for Calendar reads and Gmail actions in this session.",
      actionLabel: null,
      actionHref: null,
      accountLabel: hideSessionFallbackAccountLabel(account, true),
      tokenExpiresAt: new Date(accessToken.expiresAt * 1000).toISOString(),
      via: "auth0-token-vault",
      diagnostics: buildConnectionDiagnostics({
        connectionName: authEnv.googleConnectionName,
        connectHref,
        accountLabelSource: account.source,
        bootstrap: buildBootstrapDiagnostics("ready", "Connected-account bootstrap prerequisites are satisfied."),
        tokenExchange: createTokenExchangeSuccessDiagnostics(
          "Connected-account access token retrieval succeeded.",
        ),
      }),
    });

    logConnectionEvaluationComplete(snapshot);

    return {
      snapshot,
      delegatedAccessToken: options.includeDelegatedAccessToken ? accessToken.token : null,
    };
  } catch (error) {
    const tokenExchangeDiagnostics = createTokenExchangeErrorDiagnostics(error);

    logLiveProviderDiagnostic("google.connection.token_exchange.failed", {
      connectionName: authEnv.googleConnectionName,
      outcome: tokenExchangeDiagnostics.outcome,
      failureEdge: tokenExchangeDiagnostics.failureEdge,
      sdkErrorCode: tokenExchangeDiagnostics.sdkErrorCode,
      oauthErrorCode: tokenExchangeDiagnostics.oauthErrorCode,
      oauthErrorMessage: tokenExchangeDiagnostics.oauthErrorMessage,
    });

    if (error instanceof AccessTokenForConnectionError) {
      switch (error.code) {
        case AccessTokenForConnectionErrorCode.MISSING_SESSION: {
          const snapshot = buildSnapshot({
            state: "not-connected",
            headline: "Auth0 session is missing for Google connect.",
            detail:
              "Connected-account bootstrap cannot run without an active Auth0 session." +
              formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: "Sign in with Auth0",
            actionHref: session.loginHref ?? "/auth/login",
            accountLabel: hideSessionFallbackAccountLabel(account, false),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              accountLabelSource: account.source,
              bootstrap: buildBootstrapDiagnostics(
                "missing-session",
                "Connected-account bootstrap failed because no Auth0 session is active.",
              ),
              tokenExchange: tokenExchangeDiagnostics,
            }),
          });

          logConnectionEvaluationComplete(snapshot);

          return {
            snapshot,
            delegatedAccessToken: null,
          };
        }
        case AccessTokenForConnectionErrorCode.MISSING_REFRESH_TOKEN: {
          const snapshot = buildSnapshot({
            state: "expired",
            headline: "Auth0 session cannot bootstrap Google connect.",
            detail:
              "Auth0 could not refresh the bootstrap token needed before Google handoff. Sign in again with offline access." +
              formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: session.logoutHref ? "Refresh Auth0 session" : session.loginHref ? "Sign in with Auth0" : null,
            actionHref: session.logoutHref ?? session.loginHref,
            accountLabel: hideSessionFallbackAccountLabel(account, false),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              accountLabelSource: account.source,
              bootstrap: buildBootstrapDiagnostics(
                "missing-refresh-token",
                "Connected-account bootstrap failed because the session has no refresh token.",
              ),
              tokenExchange: tokenExchangeDiagnostics,
            }),
          });

          logConnectionEvaluationComplete(snapshot);

          return {
            snapshot,
            delegatedAccessToken: null,
          };
        }
        case AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE: {
          const isBootstrapFailure = tokenExchangeDiagnostics.failureEdge === "bootstrap-token";
          const snapshot = buildSnapshot({
            state: isBootstrapFailure ? "unavailable" : "not-connected",
            headline: isBootstrapFailure
              ? "Auth0 bootstrap token stage failed before Google handoff."
              : "Google still needs to be linked through Auth0.",
            detail: isBootstrapFailure
              ? "Auth0 could not retrieve the connected-account bootstrap token required before redirecting to Google. Verify tenant session/token policy and reconnect." +
                formatTokenExchangeDiagnostics(tokenExchangeDiagnostics)
              : "Auth0 could not exchange the current session into delegated Google access yet. Connect Google through Auth0 before agents use Calendar or Gmail." +
                formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: isBootstrapFailure
              ? session.logoutHref
                ? "Refresh Auth0 session"
                : session.loginHref
                  ? "Sign in with Auth0"
                  : null
              : "Connect Google with Auth0",
            actionHref: isBootstrapFailure ? session.logoutHref ?? session.loginHref : connectHref,
            accountLabel: hideSessionFallbackAccountLabel(account, false),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              accountLabelSource: account.source,
              bootstrap: buildBootstrapDiagnostics(
                "ready",
                "Connected-account bootstrap prerequisites looked valid, but exchange failed.",
              ),
              tokenExchange: tokenExchangeDiagnostics,
            }),
          });

          logConnectionEvaluationComplete(snapshot);

          return {
            snapshot,
            delegatedAccessToken: null,
          };
        }
      }
    }

    const snapshot = buildSnapshot({
      state: "unavailable",
      headline: "Google access is unavailable.",
      detail:
        "Auth0 could not confirm delegated Google access right now. Check the provider connection or session setup and try again." +
        formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
      actionLabel: "Connect Google with Auth0",
      actionHref: connectHref,
      accountLabel: hideSessionFallbackAccountLabel(account, false),
      tokenExpiresAt: null,
      via: "auth0-token-vault",
      diagnostics: buildConnectionDiagnostics({
        connectionName: authEnv.googleConnectionName,
        connectHref,
        accountLabelSource: account.source,
        bootstrap: buildBootstrapDiagnostics(
          "ready",
          "Connected-account bootstrap prerequisites looked valid before the unexpected exchange failure.",
        ),
        tokenExchange: tokenExchangeDiagnostics,
      }),
    });

    logConnectionEvaluationComplete(snapshot);

    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }
}

export async function getGoogleConnectionSnapshotWithToken(
  session: AuthSessionSnapshot,
): Promise<GoogleConnectionSnapshotWithToken> {
  return evaluateGoogleConnectionSnapshot(session, {
    includeDelegatedAccessToken: true,
  });
}

export async function getGoogleConnectionSnapshot(session: AuthSessionSnapshot): Promise<ProviderConnectionSnapshot> {
  const evaluation = await evaluateGoogleConnectionSnapshot(session);
  return evaluation.snapshot;
}
