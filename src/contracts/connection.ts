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
