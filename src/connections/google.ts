import type {
  AuthSessionSnapshot,
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

function nowIsoString(): string {
  return new Date().toISOString();
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
  tokenExchange: ProviderConnectionDiagnostics["tokenExchange"];
}): ProviderConnectionDiagnostics {
  return {
    evaluatedAt: nowIsoString(),
    connectionName: input.connectionName,
    connectHref: input.connectHref,
    accountLabelSource: input.accountLabelSource,
    tokenExchange: input.tokenExchange,
  };
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
        accountLabel: account.label,
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
        accountLabel: account.label,
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
        accountLabel: account.label,
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
        accountLabel: account.label,
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
        accountLabel: account.label,
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
      tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
        "Auth0 is not fully configured, so no token exchange attempt was made.",
      ),
    }),
  };
}

export async function getGoogleConnectionSnapshot(session: AuthSessionSnapshot): Promise<ProviderConnectionSnapshot> {
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

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      via: snapshot.via,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeAttempted: snapshot.diagnostics?.tokenExchange.attempted ?? false,
    });

    return snapshot;
  }

  if (!authEnv.isConfigured || !auth0) {
    const snapshot = buildAuthUnavailableSnapshot({
      detail:
        "Auth0 is not fully configured, so the shell cannot start or inspect delegated Google access yet.",
      connectionName: authEnv.googleConnectionName,
      connectHref,
      accountLabelSource: account.source,
    });

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      via: snapshot.via,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeAttempted: snapshot.diagnostics?.tokenExchange.attempted ?? false,
    });

    return snapshot;
  }

  if (session.state !== "signed-in") {
    const snapshot: ProviderConnectionSnapshot = {
      provider: "google",
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
        tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
          "Connection evaluation requires an active Auth0 session first.",
        ),
      }),
    };

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      via: snapshot.via,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeAttempted: snapshot.diagnostics?.tokenExchange.attempted ?? false,
    });

    return snapshot;
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

    const snapshot: ProviderConnectionSnapshot = {
      provider: "google",
      state: "connected",
      headline: "Google is connected through Auth0.",
      detail: "Auth0 can mint delegated Google access for Calendar reads and Gmail actions in this session.",
      actionLabel: null,
      actionHref: null,
      accountLabel: account.label,
      tokenExpiresAt: new Date(accessToken.expiresAt * 1000).toISOString(),
      via: "auth0-token-vault",
      diagnostics: buildConnectionDiagnostics({
        connectionName: authEnv.googleConnectionName,
        connectHref,
        accountLabelSource: account.source,
        tokenExchange: createTokenExchangeSuccessDiagnostics(
          "Connected-account access token retrieval succeeded.",
        ),
      }),
    };

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      via: snapshot.via,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeAttempted: snapshot.diagnostics?.tokenExchange.attempted ?? false,
    });

    return snapshot;
  } catch (error) {
    const tokenExchangeDiagnostics = createTokenExchangeErrorDiagnostics(error);

    logLiveProviderDiagnostic("google.connection.token_exchange.failed", {
      connectionName: authEnv.googleConnectionName,
      outcome: tokenExchangeDiagnostics.outcome,
      sdkErrorCode: tokenExchangeDiagnostics.sdkErrorCode,
      oauthErrorCode: tokenExchangeDiagnostics.oauthErrorCode,
      oauthErrorMessage: tokenExchangeDiagnostics.oauthErrorMessage,
    });

    if (error instanceof AccessTokenForConnectionError) {
      switch (error.code) {
        case AccessTokenForConnectionErrorCode.MISSING_SESSION:
          return {
            provider: "google",
            state: "not-connected",
            headline: "Google is not connected yet.",
            detail:
              "There is no active Auth0 session for delegated access. Sign in again before linking Google." +
              formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: "Sign in with Auth0",
            actionHref: session.loginHref ?? "/auth/login",
            accountLabel: account.label,
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              accountLabelSource: account.source,
              tokenExchange: tokenExchangeDiagnostics,
            }),
          };
        case AccessTokenForConnectionErrorCode.MISSING_REFRESH_TOKEN:
          return {
            provider: "google",
            state: "expired",
            headline: "Google delegated access has expired.",
            detail:
              "Auth0 could not refresh the delegated token path. Sign in again to restore Google access cleanly." +
              formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: session.logoutHref ? "Refresh Auth0 session" : session.loginHref ? "Sign in with Auth0" : null,
            actionHref: session.logoutHref ?? session.loginHref,
            accountLabel: account.label,
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              accountLabelSource: account.source,
              tokenExchange: tokenExchangeDiagnostics,
            }),
          };
        case AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE:
          return {
            provider: "google",
            state: "not-connected",
            headline: "Google still needs to be linked through Auth0.",
            detail:
              "Auth0 could not exchange the session for delegated Google access yet. Connect the Google account before agents use Calendar or Gmail." +
              formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: "Connect Google with Auth0",
            actionHref: connectHref,
            accountLabel: account.label,
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              accountLabelSource: account.source,
              tokenExchange: tokenExchangeDiagnostics,
            }),
          };
      }
    }

    return {
      provider: "google",
      state: "unavailable",
      headline: "Google access is unavailable.",
      detail:
        "Auth0 could not confirm delegated Google access right now. Check the provider connection or session setup and try again." +
        formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
      actionLabel: "Connect Google with Auth0",
      actionHref: connectHref,
      accountLabel: account.label,
      tokenExpiresAt: null,
      via: "auth0-token-vault",
      diagnostics: buildConnectionDiagnostics({
        connectionName: authEnv.googleConnectionName,
        connectHref,
        accountLabelSource: account.source,
        tokenExchange: tokenExchangeDiagnostics,
      }),
    };
  }
}
