import type { AuthSessionSnapshot } from "@/contracts";
import { getAuthSession } from "@/auth/auth0";
import { getAuth0Environment } from "@/auth/env";

function joinMissingValues(values: string[]): string {
  if (values.length === 1) {
    return values[0];
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

export async function getAuthSessionSnapshot(): Promise<AuthSessionSnapshot> {
  const authEnv = getAuth0Environment();

  if (!authEnv.isConfigured) {
    return {
      state: "unavailable",
      headline: "Auth0 setup is incomplete.",
      detail: `Add ${joinMissingValues(authEnv.missingValues)} to enable sign-in and Auth0-backed Google access.`,
      loginHref: null,
      logoutHref: null,
      user: null,
    };
  }

  const session = await getAuthSession();

  if (!session) {
    return {
      state: "signed-out",
      headline: "Sign in before agents request external access.",
      detail: "Warrant keeps local policy separate, but Google access still begins with an Auth0 session you control.",
      loginHref: "/auth/login",
      logoutHref: null,
      user: null,
    };
  }

  const user = {
    name: session.user.name ?? session.user.nickname ?? session.user.email ?? session.user.sub ?? "Authenticated user",
    email: session.user.email ?? null,
    pictureUrl: session.user.picture ?? null,
  };

  return {
    state: "signed-in",
    headline: `Signed in as ${user.name}.`,
    detail: "Your app session is active. Google access is still a separate Auth0-managed connection, not an implied entitlement.",
    loginHref: null,
    logoutHref: "/auth/logout",
    user,
  };
}
