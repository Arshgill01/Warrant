export type ProviderConnectionState = "connected" | "not-connected" | "pending" | "unavailable";

export interface ProviderConnectionSnapshot {
  provider: "google";
  state: ProviderConnectionState;
  headline: string;
  detail: string;
  actionLabel: string | null;
  actionHref: string | null;
  accountLabel: string | null;
  tokenExpiresAt: string | null;
  via: "auth0-token-vault" | "shell-override" | "missing-config";
}

export interface ProviderConnectionSetupSnapshot {
  provider: "google";
  status: "ready" | "setup-required";
  headline: string;
  detail: string;
  connectionName: string;
  requestedScopes: string[];
  requestedAuthParams: Array<{
    key: string;
    value: string;
  }>;
  tokenVaultConnectionId: string | null;
}
