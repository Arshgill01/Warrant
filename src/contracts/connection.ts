export type ProviderConnectionState = "connected" | "not-connected" | "pending" | "expired" | "unavailable";

export type ProviderConnectFlowState =
  | "not-started"
  | "started"
  | "bootstrap-token-failure"
  | "tenant-config-issue"
  | "callback-redirect-issue";

export type ProviderConnectionLifecycleState =
  | "delegated-ready"
  | "not-connected"
  | "connect-flow-not-started"
  | "connect-flow-started"
  | "bootstrap-token-failure"
  | "identity-visible-access-unusable"
  | "tenant-config-issue"
  | "callback-redirect-issue";

export type ProviderTokenExchangeOutcome =
  | "not-attempted"
  | "success"
  | "missing-session"
  | "missing-refresh-token"
  | "failed-to-exchange"
  | "unexpected-error";

export type ProviderTokenExchangeFailureEdge =
  | "none"
  | "bootstrap-token"
  | "delegated-token-exchange"
  | "unknown";

export type ProviderConnectionBootstrapOutcome =
  | "not-attempted"
  | "ready"
  | "missing-session"
  | "missing-refresh-token"
  | "auth0-not-configured"
  | "shell-override";

export interface ProviderConnectionBootstrapDiagnostics {
  attempted: boolean;
  outcome: ProviderConnectionBootstrapOutcome;
  note: string | null;
}

export interface ProviderConnectionTokenExchangeDiagnostics {
  attempted: boolean;
  outcome: ProviderTokenExchangeOutcome;
  failureEdge: ProviderTokenExchangeFailureEdge;
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
  connectStartHref: string | null;
  accountLabelSource: "override" | "session-email" | "none";
  lifecycleState: ProviderConnectionLifecycleState;
  connectFlowState: ProviderConnectFlowState;
  connectFailureCode: string | null;
  connectFailureDetail: string | null;
  bootstrap: ProviderConnectionBootstrapDiagnostics;
  tokenExchange: ProviderConnectionTokenExchangeDiagnostics;
}

export interface ProviderConnectionSnapshot {
  provider: "google";
  state: ProviderConnectionState;
  lifecycleState: ProviderConnectionLifecycleState;
  lifecycleDetail: string;
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
