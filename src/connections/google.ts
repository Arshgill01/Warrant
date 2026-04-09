import type {
  AuthSessionSnapshot,
  ProviderConnectFlowState,
  ProviderConnectionBootstrapDiagnostics,
  ProviderConnectionDiagnostics,
  ProviderConnectionLifecycleState,
  ProviderConnectionSetupSnapshot,
  ProviderConnectionSnapshot,
  ProviderConnectionState,
} from "@/contracts";
import { AccessTokenForConnectionError, AccessTokenForConnectionErrorCode, auth0 } from "@/auth";
import { getAuth0Environment } from "@/auth/env";
import {
  buildGoogleConnectStartHref,
  type GoogleConnectFlowContext,
} from "@/connections/google-connect-flow";
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

export const googleConnectionLifecycleLegend: Array<{
  state: ProviderConnectionLifecycleState;
  label: string;
  detail: string;
}> = [
  {
    state: "delegated-ready",
    label: "Delegated access ready",
    detail: "Auth0 can mint delegated Google tokens right now.",
  },
  {
    state: "not-connected",
    label: "Not connected",
    detail: "Google has not been linked through Auth0 yet.",
  },
  {
    state: "connect-flow-not-started",
    label: "Connect flow not started",
    detail: "No successful connect handoff attempt has been started from this shell state.",
  },
  {
    state: "connect-flow-started",
    label: "Connect flow started",
    detail: "Auth0 connect initiation started, but delegated readiness is still pending.",
  },
  {
    state: "bootstrap-token-failure",
    label: "Bootstrap failure before handoff",
    detail: "Auth0 failed before Google consent handoff could start.",
  },
  {
    state: "identity-visible-access-unusable",
    label: "Identity visible, access unusable",
    detail: "An account identity is visible, but Auth0 still cannot mint delegated access tokens.",
  },
  {
    state: "tenant-config-issue",
    label: "Tenant/config issue",
    detail: "Auth0 app or tenant configuration is blocking connected-account readiness.",
  },
  {
    state: "callback-redirect-issue",
    label: "Callback/redirect issue",
    detail: "Connect callback or redirect settings are blocking completion.",
  },
];

function nowIsoString(): string {
  return new Date().toISOString();
}

function mapFlowState(flow: GoogleConnectFlowContext | null | undefined): ProviderConnectFlowState {
  return flow?.state ?? "not-started";
}

function lifecycleDetail(state: ProviderConnectionLifecycleState): string {
  switch (state) {
    case "delegated-ready":
      return "Delegated Google access is usable in this session.";
    case "not-connected":
      return "Google is not linked through Auth0 for this session.";
    case "connect-flow-not-started":
      return "Connect flow has not been started from this shell state yet.";
    case "connect-flow-started":
      return "Connect flow started, but delegated readiness has not been verified yet.";
    case "bootstrap-token-failure":
      return "Auth0 failed before Google consent handoff could begin.";
    case "identity-visible-access-unusable":
      return "Identity can be shown, but delegated token minting is still blocked.";
    case "tenant-config-issue":
      return "Auth0 tenant or app configuration is preventing delegated Google readiness.";
    case "callback-redirect-issue":
      return "Auth0 callback/redirect settings are preventing connect completion.";
  }
}

function resolveFlowLifecycle(flowState: ProviderConnectFlowState): ProviderConnectionLifecycleState | null {
  switch (flowState) {
    case "started":
      return "connect-flow-started";
    case "bootstrap-token-failure":
      return "bootstrap-token-failure";
    case "tenant-config-issue":
      return "tenant-config-issue";
    case "callback-redirect-issue":
      return "callback-redirect-issue";
    case "not-started":
    default:
      return null;
  }
}

function resolveFailedExchangeLifecycle(input: {
  flowState: ProviderConnectFlowState;
  accountLabel: string | null;
}): ProviderConnectionLifecycleState {
  const fromFlow = resolveFlowLifecycle(input.flowState);

  if (fromFlow) {
    return fromFlow;
  }

  if (input.accountLabel) {
    return "identity-visible-access-unusable";
  }

  return "connect-flow-not-started";
}

function resolveFailedExchangeState(
  lifecycleState: ProviderConnectionLifecycleState,
): ProviderConnectionState {
  if (lifecycleState === "connect-flow-started") {
    return "pending";
  }

  if (lifecycleState === "connect-flow-not-started" || lifecycleState === "not-connected") {
    return "not-connected";
  }

  return "unavailable";
}

function buildFailedExchangeHeadline(
  lifecycleState: ProviderConnectionLifecycleState,
): string {
  switch (lifecycleState) {
    case "bootstrap-token-failure":
      return "Auth0 failed before Google handoff could start.";
    case "tenant-config-issue":
      return "Auth0 tenant or setup blocked Google connect.";
    case "callback-redirect-issue":
      return "Google connect callback or redirect settings failed.";
    case "connect-flow-started":
      return "Google connect flow started, but delegated access is still pending.";
    case "identity-visible-access-unusable":
      return "Google account identity is visible, but delegated access is unusable.";
    case "connect-flow-not-started":
    case "not-connected":
      return "Google still needs to be linked through Auth0.";
    case "delegated-ready":
      return "Google delegated access is ready.";
  }
}

function buildFailedExchangeDetail(
  lifecycleState: ProviderConnectionLifecycleState,
): string {
  switch (lifecycleState) {
    case "bootstrap-token-failure":
      return "Auth0 could not obtain the connected-account bootstrap token before provider handoff.";
    case "tenant-config-issue":
      return "Auth0 configuration appears to block connect initiation or token bootstrap for this session.";
    case "callback-redirect-issue":
      return "The connect callback or redirect path appears misconfigured, so completion cannot be verified.";
    case "connect-flow-started":
      return "A connect attempt has started, but delegated token minting is not ready yet.";
    case "identity-visible-access-unusable":
      return "Session identity is visible, but Auth0 still cannot mint a delegated Google token.";
    case "connect-flow-not-started":
    case "not-connected":
      return "Run the connected-account flow through Auth0 before Calendar and Gmail delegated actions.";
    case "delegated-ready":
      return "Delegated Google access is available.";
  }
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

function resolveBootstrapDiagnostics(input: {
  lifecycleState: ProviderConnectionLifecycleState;
  connectFlowState: ProviderConnectFlowState;
  tokenExchange: ProviderConnectionDiagnostics["tokenExchange"];
}): ProviderConnectionBootstrapDiagnostics {
  const tokenExchange = input.tokenExchange;

  if (tokenExchange.note?.toLowerCase().includes("shell override")) {
    return {
      attempted: false,
      outcome: "shell-override",
      note: "Shell override is active, so bootstrap readiness is controlled by override state.",
    };
  }

  if (tokenExchange.outcome === "missing-session") {
    return {
      attempted: true,
      outcome: "missing-session",
      note: "Connected-account bootstrap failed because no active Auth0 session was available.",
    };
  }

  if (tokenExchange.outcome === "missing-refresh-token") {
    return {
      attempted: true,
      outcome: "missing-refresh-token",
      note: "Connected-account bootstrap failed because the session was missing a refresh token.",
    };
  }

  if (input.connectFlowState === "tenant-config-issue") {
    return {
      attempted: false,
      outcome: "auth0-not-configured",
      note: "Auth0 tenant/app setup appears to block bootstrap token retrieval.",
    };
  }

  if (
    tokenExchange.outcome === "success" ||
    tokenExchange.outcome === "failed-to-exchange" ||
    tokenExchange.outcome === "unexpected-error"
  ) {
    return {
      attempted: true,
      outcome: "ready",
      note: "Connected-account bootstrap prerequisites were satisfied for token exchange.",
    };
  }

  if (
    tokenExchange.outcome === "not-attempted" &&
    input.lifecycleState === "not-connected"
  ) {
    return {
      attempted: false,
      outcome: "missing-session",
      note: "Bootstrap cannot run until an Auth0 session is active.",
    };
  }

  return {
    attempted: false,
    outcome: "not-attempted",
    note: "Connected-account bootstrap was not attempted during this evaluation.",
  };
}

function buildConnectionDiagnostics(input: {
  connectionName: string;
  connectHref: string | null;
  connectStartHref: string | null;
  accountLabelSource: ProviderConnectionDiagnostics["accountLabelSource"];
  lifecycleState: ProviderConnectionLifecycleState;
  connectFlowState: ProviderConnectFlowState;
  connectFailureCode: string | null;
  connectFailureDetail: string | null;
  tokenExchange: ProviderConnectionDiagnostics["tokenExchange"];
}): ProviderConnectionDiagnostics {
  return {
    evaluatedAt: nowIsoString(),
    connectionName: input.connectionName,
    connectHref: input.connectHref,
    connectStartHref: input.connectStartHref,
    accountLabelSource: input.accountLabelSource,
    lifecycleState: input.lifecycleState,
    connectFlowState: input.connectFlowState,
    connectFailureCode: input.connectFailureCode,
    connectFailureDetail: input.connectFailureDetail,
    bootstrap: resolveBootstrapDiagnostics({
      lifecycleState: input.lifecycleState,
      connectFlowState: input.connectFlowState,
      tokenExchange: input.tokenExchange,
    }),
    tokenExchange: input.tokenExchange,
  };
}

function buildOverrideSnapshot(input: {
  state: ProviderConnectionState;
  session: AuthSessionSnapshot;
  connectHref: string;
  connectStartHref: string;
}): ProviderConnectionSnapshot {
  const authEnv = getAuth0Environment();
  const account = resolveConnectedAccountLabel(input.session);
  const lifecycleState: ProviderConnectionLifecycleState =
    input.state === "connected"
      ? "delegated-ready"
      : input.state === "pending"
        ? "connect-flow-started"
        : input.state === "expired"
          ? "identity-visible-access-unusable"
          : input.state === "not-connected"
            ? "connect-flow-not-started"
            : "tenant-config-issue";

  const diagnostics = buildConnectionDiagnostics({
    connectionName: authEnv.googleConnectionName,
    connectHref: input.connectHref,
    connectStartHref: input.connectStartHref,
    accountLabelSource: account.source,
    lifecycleState,
    connectFlowState: "not-started",
    connectFailureCode: null,
    connectFailureDetail: null,
    tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
      "Shell override is active, so no live token exchange was attempted.",
    ),
  });

  switch (input.state) {
    case "connected":
      return {
        provider: "google",
        state: input.state,
        lifecycleState,
        lifecycleDetail: lifecycleDetail(lifecycleState),
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
        state: input.state,
        lifecycleState,
        lifecycleDetail: lifecycleDetail(lifecycleState),
        headline: "Google connection is pending.",
        detail: "Auth0 has started the provider handoff, but the delegated access path is not ready yet.",
        actionLabel: "Continue Google connect with Auth0",
        actionHref: input.connectStartHref,
        accountLabel: hideSessionFallbackAccountLabel(account, false),
        tokenExpiresAt: null,
        via: "shell-override",
        diagnostics,
      };
    case "not-connected":
      return {
        provider: "google",
        state: input.state,
        lifecycleState,
        lifecycleDetail: lifecycleDetail(lifecycleState),
        headline: "Google is not connected yet.",
        detail: "This shell override keeps the provider disconnected until you link Google through Auth0.",
        actionLabel: input.session.state === "signed-in" ? "Connect Google with Auth0" : input.session.loginHref ? "Sign in with Auth0" : null,
        actionHref: input.session.state === "signed-in" ? input.connectStartHref : input.session.loginHref,
        accountLabel: hideSessionFallbackAccountLabel(account, false),
        tokenExpiresAt: null,
        via: "shell-override",
        diagnostics,
      };
    case "expired":
      return {
        provider: "google",
        state: input.state,
        lifecycleState,
        lifecycleDetail: lifecycleDetail(lifecycleState),
        headline: "Google delegated access expired.",
        detail: "The shell override marks the previous delegated path as expired until Auth0 re-establishes it.",
        actionLabel: input.session.logoutHref ? "Refresh Auth0 session" : input.session.loginHref ? "Sign in with Auth0" : null,
        actionHref: input.session.logoutHref ?? input.session.loginHref,
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
        lifecycleState,
        lifecycleDetail: lifecycleDetail(lifecycleState),
        headline: "Google access is unavailable.",
        detail: "The shell override leaves delegated Google access unavailable until the real Auth0 provider path is ready.",
        actionLabel: "Retry Google connect with Auth0",
        actionHref: input.connectStartHref,
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
  connectStartHref: string | null;
  accountLabelSource: ProviderConnectionDiagnostics["accountLabelSource"];
  connectFlowState: ProviderConnectFlowState;
  connectFailureCode: string | null;
  connectFailureDetail: string | null;
}): ProviderConnectionSnapshot {
  const lifecycleState = resolveFlowLifecycle(input.connectFlowState) ?? "tenant-config-issue";

  return {
    provider: "google",
    state: "unavailable",
    lifecycleState,
    lifecycleDetail: lifecycleDetail(lifecycleState),
    headline: "Google connection is unavailable.",
    detail: input.detail,
    actionLabel: "Review Auth0 setup and retry connect",
    actionHref: input.connectStartHref,
    accountLabel: null,
    tokenExpiresAt: null,
    via: "missing-config",
    diagnostics: buildConnectionDiagnostics({
      connectionName: input.connectionName,
      connectHref: input.connectHref,
      connectStartHref: input.connectStartHref,
      accountLabelSource: input.accountLabelSource,
      lifecycleState,
      connectFlowState: input.connectFlowState,
      connectFailureCode: input.connectFailureCode,
      connectFailureDetail: input.connectFailureDetail,
      tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
        "Auth0 is not fully configured, so no token exchange attempt was made.",
      ),
    }),
  };
}

export interface GoogleConnectionSnapshotOptions {
  connectFlow?: GoogleConnectFlowContext | null;
}

export interface GoogleConnectionSnapshotWithToken {
  snapshot: ProviderConnectionSnapshot;
  delegatedAccessToken: string | null;
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
      "The shell starts a connect wrapper that forwards into /auth/connect with offline Google access and surfaces bootstrap failures before Google handoff when they happen.",
    connectionName: authEnv.googleConnectionName,
    requestedScopes: [...googleDelegatedScopes],
    requestedAuthParams: Object.entries(googleConnectAuthorizationParams).map(([key, value]) => ({ key, value })),
    tokenVaultConnectionId: authEnv.tokenVaultConnectionId,
  };
}

export async function getGoogleConnectionSnapshot(
  session: AuthSessionSnapshot,
  options: GoogleConnectionSnapshotOptions = {},
): Promise<ProviderConnectionSnapshot> {
  const authEnv = getAuth0Environment();
  const connectHref = buildGoogleConnectHref(authEnv.googleConnectionName);
  const connectStartHref = buildGoogleConnectStartHref("/");
  const account = resolveConnectedAccountLabel(session);
  const connectFlowState = mapFlowState(options.connectFlow);
  const connectFailureCode = options.connectFlow?.errorCode ?? null;
  const connectFailureDetail = options.connectFlow?.errorDetail ?? null;

  logLiveProviderDiagnostic("google.connection.evaluate.start", {
    sessionState: session.state,
    authConfigured: authEnv.isConfigured,
    connectionName: authEnv.googleConnectionName,
    hasConnectionOverride: Boolean(authEnv.googleConnectionStateOverride),
    connectHref,
    connectStartHref,
    connectFlowState,
    connectFailureCode,
  });

  if (authEnv.googleConnectionStateOverride) {
    const snapshot = buildOverrideSnapshot({
      state: authEnv.googleConnectionStateOverride,
      session,
      connectHref,
      connectStartHref,
    });

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      lifecycleState: snapshot.lifecycleState,
      via: snapshot.via,
      bootstrapOutcome: snapshot.diagnostics?.bootstrap.outcome ?? null,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeFailureEdge: snapshot.diagnostics?.tokenExchange.failureEdge ?? null,
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
      connectStartHref,
      accountLabelSource: account.source,
      connectFlowState,
      connectFailureCode,
      connectFailureDetail,
    });

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      lifecycleState: snapshot.lifecycleState,
      via: snapshot.via,
      bootstrapOutcome: snapshot.diagnostics?.bootstrap.outcome ?? null,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeFailureEdge: snapshot.diagnostics?.tokenExchange.failureEdge ?? null,
      tokenExchangeAttempted: snapshot.diagnostics?.tokenExchange.attempted ?? false,
    });

    return snapshot;
  }

  if (session.state !== "signed-in") {
    const lifecycleState: ProviderConnectionLifecycleState = "not-connected";
    const snapshot: ProviderConnectionSnapshot = {
      provider: "google",
      state: "not-connected",
      lifecycleState,
      lifecycleDetail: lifecycleDetail(lifecycleState),
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
        connectStartHref,
        accountLabelSource: account.source,
        lifecycleState,
        connectFlowState,
        connectFailureCode,
        connectFailureDetail,
        tokenExchange: createTokenExchangeNotAttemptedDiagnostics(
          "Connection evaluation requires an active Auth0 session first.",
        ),
      }),
    };

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      lifecycleState: snapshot.lifecycleState,
      via: snapshot.via,
      bootstrapOutcome: snapshot.diagnostics?.bootstrap.outcome ?? null,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeFailureEdge: snapshot.diagnostics?.tokenExchange.failureEdge ?? null,
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

    const lifecycleState: ProviderConnectionLifecycleState = "delegated-ready";
    const snapshot: ProviderConnectionSnapshot = {
      provider: "google",
      state: "connected",
      lifecycleState,
      lifecycleDetail: lifecycleDetail(lifecycleState),
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
        connectStartHref,
        accountLabelSource: account.source,
        lifecycleState,
        connectFlowState,
        connectFailureCode,
        connectFailureDetail,
        tokenExchange: createTokenExchangeSuccessDiagnostics(
          "Connected-account access token retrieval succeeded.",
        ),
      }),
    };

    logLiveProviderDiagnostic("google.connection.evaluate.complete", {
      state: snapshot.state,
      lifecycleState: snapshot.lifecycleState,
      via: snapshot.via,
      bootstrapOutcome: snapshot.diagnostics?.bootstrap.outcome ?? null,
      tokenExchangeOutcome: snapshot.diagnostics?.tokenExchange.outcome ?? null,
      tokenExchangeFailureEdge: snapshot.diagnostics?.tokenExchange.failureEdge ?? null,
      tokenExchangeAttempted: snapshot.diagnostics?.tokenExchange.attempted ?? false,
    });

    return snapshot;
  } catch (error) {
    const tokenExchangeDiagnostics = createTokenExchangeErrorDiagnostics(error);

    logLiveProviderDiagnostic("google.connection.token_exchange.failed", {
      connectionName: authEnv.googleConnectionName,
      outcome: tokenExchangeDiagnostics.outcome,
      failureEdge: tokenExchangeDiagnostics.failureEdge,
      sdkErrorCode: tokenExchangeDiagnostics.sdkErrorCode,
      oauthErrorCode: tokenExchangeDiagnostics.oauthErrorCode,
      oauthErrorMessage: tokenExchangeDiagnostics.oauthErrorMessage,
      connectFlowState,
      connectFailureCode,
    });

    if (error instanceof AccessTokenForConnectionError) {
      switch (error.code) {
        case AccessTokenForConnectionErrorCode.MISSING_SESSION: {
          const lifecycleState: ProviderConnectionLifecycleState = "not-connected";

          return {
            provider: "google",
            state: "not-connected",
            lifecycleState,
            lifecycleDetail: lifecycleDetail(lifecycleState),
            headline: "Google is not connected yet.",
            detail:
              "There is no active Auth0 session for delegated access. Sign in again before linking Google." +
              formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: "Sign in with Auth0",
            actionHref: session.loginHref ?? "/auth/login",
            accountLabel: hideSessionFallbackAccountLabel(account, false),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              connectStartHref,
              accountLabelSource: account.source,
              lifecycleState,
              connectFlowState,
              connectFailureCode,
              connectFailureDetail,
              tokenExchange: tokenExchangeDiagnostics,
            }),
          };
        }
        case AccessTokenForConnectionErrorCode.MISSING_REFRESH_TOKEN: {
          const lifecycleState: ProviderConnectionLifecycleState = "identity-visible-access-unusable";

          return {
            provider: "google",
            state: "expired",
            lifecycleState,
            lifecycleDetail: lifecycleDetail(lifecycleState),
            headline: "Google delegated access has expired.",
            detail:
              "Auth0 could not refresh the delegated token path. Sign in again to restore Google access cleanly." +
              formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
            actionLabel: session.logoutHref ? "Refresh Auth0 session" : session.loginHref ? "Sign in with Auth0" : null,
            actionHref: session.logoutHref ?? session.loginHref,
            accountLabel: hideSessionFallbackAccountLabel(account, false),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              connectStartHref,
              accountLabelSource: account.source,
              lifecycleState,
              connectFlowState,
              connectFailureCode,
              connectFailureDetail,
              tokenExchange: tokenExchangeDiagnostics,
            }),
          };
        }
        case AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE: {
          const lifecycleState =
            tokenExchangeDiagnostics.failureEdge === "bootstrap-token"
              ? "bootstrap-token-failure"
              : resolveFailedExchangeLifecycle({
                  flowState: connectFlowState,
                  accountLabel: hideSessionFallbackAccountLabel(account, false),
                });

          return {
            provider: "google",
            state: resolveFailedExchangeState(lifecycleState),
            lifecycleState,
            lifecycleDetail: lifecycleDetail(lifecycleState),
            headline: buildFailedExchangeHeadline(lifecycleState),
            detail:
              `${buildFailedExchangeDetail(lifecycleState)}${formatTokenExchangeDiagnostics(tokenExchangeDiagnostics)}`,
            actionLabel: "Connect Google with Auth0",
            actionHref: connectStartHref,
            accountLabel: hideSessionFallbackAccountLabel(account, false),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
            diagnostics: buildConnectionDiagnostics({
              connectionName: authEnv.googleConnectionName,
              connectHref,
              connectStartHref,
              accountLabelSource: account.source,
              lifecycleState,
              connectFlowState,
              connectFailureCode,
              connectFailureDetail,
              tokenExchange: tokenExchangeDiagnostics,
            }),
          };
        }
      }
    }

    const lifecycleState =
      resolveFlowLifecycle(connectFlowState) ??
      (account.label ? "identity-visible-access-unusable" : "tenant-config-issue");

    return {
      provider: "google",
      state: lifecycleState === "connect-flow-started" ? "pending" : "unavailable",
      lifecycleState,
      lifecycleDetail: lifecycleDetail(lifecycleState),
      headline: "Google access is unavailable.",
      detail:
        "Auth0 could not confirm delegated Google access right now. Check the provider connection or session setup and try again." +
        formatTokenExchangeDiagnostics(tokenExchangeDiagnostics),
      actionLabel: "Connect Google with Auth0",
      actionHref: connectStartHref,
      accountLabel: hideSessionFallbackAccountLabel(account, false),
      tokenExpiresAt: null,
      via: "auth0-token-vault",
      diagnostics: buildConnectionDiagnostics({
        connectionName: authEnv.googleConnectionName,
        connectHref,
        connectStartHref,
        accountLabelSource: account.source,
        lifecycleState,
        connectFlowState,
        connectFailureCode,
        connectFailureDetail,
        tokenExchange: tokenExchangeDiagnostics,
      }),
    };
  }
}

export async function getGoogleConnectionSnapshotWithToken(
  session: AuthSessionSnapshot,
  options: GoogleConnectionSnapshotOptions = {},
): Promise<GoogleConnectionSnapshotWithToken> {
  const snapshot = await getGoogleConnectionSnapshot(session, options);

  if (snapshot.state !== "connected") {
    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }

  const authEnv = getAuth0Environment();

  if (!authEnv.isConfigured || !auth0) {
    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }

  try {
    const accessToken = await auth0.getAccessTokenForConnection({
      connection: authEnv.googleConnectionName,
      login_hint: session.user?.email ?? undefined,
    });

    return {
      snapshot,
      delegatedAccessToken: accessToken.token,
    };
  } catch (error) {
    const diagnostics = createTokenExchangeErrorDiagnostics(error);

    logLiveProviderDiagnostic("google.connection.token_exchange.reuse_failed", {
      connectionName: authEnv.googleConnectionName,
      outcome: diagnostics.outcome,
      failureEdge: diagnostics.failureEdge,
      sdkErrorCode: diagnostics.sdkErrorCode,
      oauthErrorCode: diagnostics.oauthErrorCode,
    });

    return {
      snapshot,
      delegatedAccessToken: null,
    };
  }
}
