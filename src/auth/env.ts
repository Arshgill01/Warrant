import type { ProviderConnectionState } from "@/contracts";

export interface Auth0Environment {
  domain: string | null;
  clientId: string | null;
  clientSecret: string | null;
  secret: string | null;
  appBaseUrl: string | null;
  audience: string | null;
  tokenVaultConnectionId: string | null;
  googleConnectionName: string;
  googleConnectionStateOverride: ProviderConnectionState | null;
  googleConnectionEmailOverride: string | null;
  isConfigured: boolean;
  missingValues: string[];
}

const providerConnectionStates: ProviderConnectionState[] = ["connected", "not-connected", "pending", "unavailable"];

function readValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function readConnectionStateOverride(value: string | undefined): ProviderConnectionState | null {
  const normalized = readValue(value);

  if (!normalized) {
    return null;
  }

  return providerConnectionStates.includes(normalized as ProviderConnectionState)
    ? (normalized as ProviderConnectionState)
    : null;
}

export function readAuth0Environment(env: NodeJS.ProcessEnv = process.env): Auth0Environment {
  const domain = readValue(env.AUTH0_DOMAIN);
  const clientId = readValue(env.AUTH0_CLIENT_ID);
  const clientSecret = readValue(env.AUTH0_CLIENT_SECRET);
  const secret = readValue(env.AUTH0_SECRET);
  const appBaseUrl = readValue(env.APP_BASE_URL) ?? readValue(env.NEXT_PUBLIC_APP_URL);
  const requiredValues: Array<[string, string | null]> = [
    ["AUTH0_DOMAIN", domain],
    ["AUTH0_CLIENT_ID", clientId],
    ["AUTH0_CLIENT_SECRET", clientSecret],
    ["AUTH0_SECRET", secret],
  ];
  const missingValues = requiredValues.flatMap(([key, value]) => (value ? [] : [key]));

  return {
    domain,
    clientId,
    clientSecret,
    secret,
    appBaseUrl,
    audience: readValue(env.AUTH0_AUDIENCE),
    tokenVaultConnectionId: readValue(env.AUTH0_TOKEN_VAULT_CONNECTION_ID),
    googleConnectionName: readValue(env.AUTH0_GOOGLE_CONNECTION_NAME) ?? "google-oauth2",
    googleConnectionStateOverride: readConnectionStateOverride(env.WARRANT_GOOGLE_CONNECTION_STATE),
    googleConnectionEmailOverride: readValue(env.WARRANT_GOOGLE_CONNECTION_EMAIL),
    isConfigured: missingValues.length === 0,
    missingValues,
  };
}

export function getAuth0Environment(): Auth0Environment {
  return readAuth0Environment();
}
