import type {
  AuthSessionSnapshot,
  ProviderConnectionSetupSnapshot,
  ProviderConnectionSnapshot,
  ProviderConnectionState,
} from "@/contracts";
import { AccessTokenForConnectionError, AccessTokenForConnectionErrorCode, auth0 } from "@/auth";
import { getAuth0Environment } from "@/auth/env";

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

function getConnectedAccountLabel(session: AuthSessionSnapshot): string | null {
  const authEnv = getAuth0Environment();
  return authEnv.googleConnectionEmailOverride ?? session.user?.email ?? null;
}

function buildOverrideSnapshot(state: ProviderConnectionState, session: AuthSessionSnapshot): ProviderConnectionSnapshot {
  const authEnv = getAuth0Environment();
  const connectHref = buildGoogleConnectHref(authEnv.googleConnectionName);
  const accountLabel = getConnectedAccountLabel(session);

  switch (state) {
    case "connected":
      return {
        provider: "google",
        state,
        headline: "Google is connected through Auth0.",
        detail: "The shell override marks delegated Google access as ready until the real Token Vault callback is wired.",
        actionLabel: null,
        actionHref: null,
        accountLabel,
        tokenExpiresAt: null,
        via: "shell-override",
      };
    case "pending":
      return {
        provider: "google",
        state,
        headline: "Google connection is pending.",
        detail: "Auth0 has started the provider handoff, but the delegated access path is not ready yet.",
        actionLabel: null,
        actionHref: null,
        accountLabel,
        tokenExpiresAt: null,
        via: "shell-override",
      };
    case "not-connected":
      return {
        provider: "google",
        state,
        headline: "Google is not connected yet.",
        detail: "This shell override keeps the provider disconnected until you link Google through Auth0.",
        actionLabel: session.state === "signed-in" ? "Connect Google with Auth0" : session.loginHref ? "Sign in with Auth0" : null,
        actionHref: session.state === "signed-in" ? connectHref : session.loginHref,
        accountLabel,
        tokenExpiresAt: null,
        via: "shell-override",
      };
    case "expired":
      return {
        provider: "google",
        state,
        headline: "Google delegated access expired.",
        detail: "The shell override marks the previous delegated path as expired until Auth0 re-establishes it.",
        actionLabel: session.logoutHref ? "Refresh Auth0 session" : session.loginHref ? "Sign in with Auth0" : null,
        actionHref: session.logoutHref ?? session.loginHref,
        accountLabel,
        tokenExpiresAt: null,
        via: "shell-override",
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
        accountLabel,
        tokenExpiresAt: null,
        via: "shell-override",
      };
  }
}

function buildAuthUnavailableSnapshot(detail: string): ProviderConnectionSnapshot {
  return {
    provider: "google",
    state: "unavailable",
    headline: "Google connection is unavailable.",
    detail,
    actionLabel: null,
    actionHref: null,
    accountLabel: null,
    tokenExpiresAt: null,
    via: "missing-config",
  };
}

export async function getGoogleConnectionSnapshot(session: AuthSessionSnapshot): Promise<ProviderConnectionSnapshot> {
  const authEnv = getAuth0Environment();

  if (authEnv.googleConnectionStateOverride) {
    return buildOverrideSnapshot(authEnv.googleConnectionStateOverride, session);
  }

  if (!authEnv.isConfigured || !auth0) {
    return buildAuthUnavailableSnapshot(
      "Auth0 is not fully configured, so the shell cannot start or inspect delegated Google access yet.",
    );
  }

  if (session.state !== "signed-in") {
    return {
      provider: "google",
      state: "not-connected",
      headline: "Google is not connected yet.",
      detail: "Start with Auth0 sign-in, then connect Google so Calendar and Gmail run through delegated access instead of broad app credentials.",
      actionLabel: session.loginHref ? "Sign in with Auth0" : null,
      actionHref: session.loginHref,
      accountLabel: null,
      tokenExpiresAt: null,
      via: "auth0-token-vault",
    };
  }

  try {
    const accessToken = await auth0.getAccessTokenForConnection({
      connection: authEnv.googleConnectionName,
      login_hint: session.user?.email ?? undefined,
    });

    return {
      provider: "google",
      state: "connected",
      headline: "Google is connected through Auth0.",
      detail: "Auth0 can mint delegated Google access for Calendar reads and Gmail actions in this session.",
      actionLabel: null,
      actionHref: null,
      accountLabel: getConnectedAccountLabel(session),
      tokenExpiresAt: new Date(accessToken.expiresAt * 1000).toISOString(),
      via: "auth0-token-vault",
    };
  } catch (error) {
    const connectHref = buildGoogleConnectHref(authEnv.googleConnectionName);

    if (error instanceof AccessTokenForConnectionError) {
      switch (error.code) {
        case AccessTokenForConnectionErrorCode.MISSING_SESSION:
          return {
            provider: "google",
            state: "not-connected",
            headline: "Google is not connected yet.",
            detail: "There is no active Auth0 session for delegated access. Sign in again before linking Google.",
            actionLabel: "Sign in with Auth0",
            actionHref: session.loginHref ?? "/auth/login",
            accountLabel: getConnectedAccountLabel(session),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
          };
        case AccessTokenForConnectionErrorCode.MISSING_REFRESH_TOKEN:
          return {
            provider: "google",
            state: "expired",
            headline: "Google delegated access has expired.",
            detail: "Auth0 could not refresh the delegated token path. Sign in again to restore Google access cleanly.",
            actionLabel: session.logoutHref ? "Refresh Auth0 session" : session.loginHref ? "Sign in with Auth0" : null,
            actionHref: session.logoutHref ?? session.loginHref,
            accountLabel: getConnectedAccountLabel(session),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
          };
        case AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE:
          return {
            provider: "google",
            state: "not-connected",
            headline: "Google still needs to be linked through Auth0.",
            detail: "Auth0 could not exchange the session for delegated Google access yet. Connect the Google account before agents use Calendar or Gmail.",
            actionLabel: "Connect Google with Auth0",
            actionHref: connectHref,
            accountLabel: getConnectedAccountLabel(session),
            tokenExpiresAt: null,
            via: "auth0-token-vault",
          };
      }
    }

    return {
      provider: "google",
      state: "unavailable",
      headline: "Google access is unavailable.",
      detail: "Auth0 could not confirm delegated Google access right now. Check the provider connection or session setup and try again.",
      actionLabel: "Connect Google with Auth0",
      actionHref: connectHref,
      accountLabel: getConnectedAccountLabel(session),
      tokenExpiresAt: null,
      via: "auth0-token-vault",
    };
  }
}
