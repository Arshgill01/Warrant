export type AuthSessionState = "signed-in" | "signed-out" | "unavailable";

export interface AuthenticatedUser {
  name: string;
  email: string | null;
  pictureUrl: string | null;
}

export interface AuthSessionSnapshot {
  state: AuthSessionState;
  headline: string;
  detail: string;
  loginHref: string | null;
  logoutHref: string | null;
  user: AuthenticatedUser | null;
  diagnostics?: AuthSessionDiagnostics;
}

export interface AuthSessionDiagnostics {
  checkedAt: string;
  auth0Configured: boolean;
  auth0ClientReady: boolean;
  environmentIssues: string[];
  hasSession: boolean;
  hasRefreshToken: boolean | null;
  userSub: string | null;
}
