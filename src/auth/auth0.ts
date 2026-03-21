import { AccessTokenForConnectionError, AccessTokenForConnectionErrorCode } from "@auth0/nextjs-auth0/errors";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import { getAuth0Environment } from "@/auth/env";

const authEnv = getAuth0Environment();

export const auth0 = authEnv.isConfigured
  ? new Auth0Client({
      domain: authEnv.domain ?? undefined,
      clientId: authEnv.clientId ?? undefined,
      clientSecret: authEnv.clientSecret ?? undefined,
      secret: authEnv.secret ?? undefined,
      appBaseUrl: authEnv.appBaseUrl ?? undefined,
      signInReturnToPath: "/",
      authorizationParameters: {
        audience: authEnv.audience ?? undefined,
        scope: "openid profile email offline_access",
      },
      enableAccessTokenEndpoint: false,
      enableConnectAccountEndpoint: true,
    })
  : null;

export { AccessTokenForConnectionError, AccessTokenForConnectionErrorCode };

export async function getAuthSession(): Promise<SessionData | null> {
  if (!auth0) {
    return null;
  }

  return auth0.getSession();
}
