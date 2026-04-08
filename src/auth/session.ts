import type { AuthSessionDiagnostics, AuthSessionSnapshot } from "@/contracts";
import { auth0, getAuthSession } from "@/auth/auth0";
import { getAuth0Environment } from "@/auth/env";
import { logLiveProviderDiagnostic } from "@/auth/live-provider-diagnostics";

function joinMissingValues(values: string[]): string {
  if (values.length === 1) {
    return values[0];
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function buildDiagnostics(input: {
  authConfigured: boolean;
  environmentIssues: string[];
  hasSession: boolean;
  hasRefreshToken: boolean | null;
  userSub: string | null;
}): AuthSessionDiagnostics {
  return {
    checkedAt: nowIsoString(),
    auth0Configured: input.authConfigured,
    auth0ClientReady: Boolean(auth0),
    environmentIssues: input.environmentIssues,
    hasSession: input.hasSession,
    hasRefreshToken: input.hasRefreshToken,
    userSub: input.userSub,
  };
}

export async function getAuthSessionSnapshot(): Promise<AuthSessionSnapshot> {
  const authEnv = getAuth0Environment();
  const environmentIssues = [...authEnv.missingValues, ...authEnv.invalidValues];

  if (!authEnv.isConfigured) {
    const missingDetail = authEnv.missingValues.length
      ? `Missing: ${joinMissingValues(authEnv.missingValues)}.`
      : null;
    const invalidDetail = authEnv.invalidValues.length
      ? `Invalid: ${joinMissingValues(authEnv.invalidValues)}.`
      : null;

    const diagnostics = buildDiagnostics({
      authConfigured: false,
      environmentIssues,
      hasSession: false,
      hasRefreshToken: null,
      userSub: null,
    });

    const snapshot: AuthSessionSnapshot = {
      state: "unavailable",
      headline: "Auth0 setup is incomplete.",
      detail: [missingDetail, invalidDetail, "Fix these values before enabling Auth0-backed Google access."]
        .filter(Boolean)
        .join(" "),
      loginHref: null,
      logoutHref: null,
      user: null,
      diagnostics,
    };

    logLiveProviderDiagnostic("auth0.session.snapshot", {
      state: snapshot.state,
      authConfigured: diagnostics.auth0Configured,
      auth0ClientReady: diagnostics.auth0ClientReady,
      environmentIssues: diagnostics.environmentIssues,
    });

    return snapshot;
  }

  const session = await getAuthSession();

  if (!session) {
    const diagnostics = buildDiagnostics({
      authConfigured: true,
      environmentIssues,
      hasSession: false,
      hasRefreshToken: null,
      userSub: null,
    });

    const snapshot: AuthSessionSnapshot = {
      state: "signed-out",
      headline: "Sign in before agents request external access.",
      detail: "Warrant keeps local policy separate, but Google access still begins with an Auth0 session you control.",
      loginHref: "/auth/login",
      logoutHref: null,
      user: null,
      diagnostics,
    };

    logLiveProviderDiagnostic("auth0.session.snapshot", {
      state: snapshot.state,
      authConfigured: diagnostics.auth0Configured,
      auth0ClientReady: diagnostics.auth0ClientReady,
      hasSession: diagnostics.hasSession,
    });

    return snapshot;
  }

  const user = {
    name: session.user.name ?? session.user.nickname ?? session.user.email ?? session.user.sub ?? "Authenticated user",
    email: session.user.email ?? null,
    pictureUrl: session.user.picture ?? null,
  };

  const diagnostics = buildDiagnostics({
    authConfigured: true,
    environmentIssues,
    hasSession: true,
    hasRefreshToken: Boolean(session.tokenSet.refreshToken),
    userSub: session.user.sub ?? null,
  });

  const snapshot: AuthSessionSnapshot = {
    state: "signed-in",
    headline: `Signed in as ${user.name}.`,
    detail: "Your app session is active. Google access is still a separate Auth0-managed connection, not an implied entitlement.",
    loginHref: null,
    logoutHref: "/auth/logout",
    user,
    diagnostics,
  };

  logLiveProviderDiagnostic("auth0.session.snapshot", {
    state: snapshot.state,
    hasRefreshToken: diagnostics.hasRefreshToken,
    userSubPresent: Boolean(diagnostics.userSub),
    auth0ClientReady: diagnostics.auth0ClientReady,
  });

  return snapshot;
}
