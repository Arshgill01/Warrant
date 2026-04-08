export type ProviderConnectionState = "connected" | "not-connected" | "pending" | "expired" | "unavailable";

export type ProviderTokenExchangeOutcome =
  | "not-attempted"
  | "success"
  | "missing-session"
  | "missing-refresh-token"
  | "failed-to-exchange"
  | "unexpected-error";

export interface ProviderConnectionTokenExchangeDiagnostics {
  attempted: boolean;
  outcome: ProviderTokenExchangeOutcome;
  sdkErrorCode: string | null;
  sdkErrorMessage: string | null;
  oauthErrorCode: string | null;
  oauthErrorMessage: string | null;
  note: string | null;
}

export interface ProviderConnectionDiagnostics {
  evaluatedAt: string;
  connectionName: string;
  connectHref: string | null;
  accountLabelSource: "override" | "session-email" | "none";
  tokenExchange: ProviderConnectionTokenExchangeDiagnostics;
}

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
  diagnostics?: ProviderConnectionDiagnostics;
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
