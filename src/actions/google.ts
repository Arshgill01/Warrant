import type {
  AuthSessionSnapshot,
  CalendarAvailabilityPayload,
  CalendarAvailabilityReadInput,
  CalendarAvailabilityResult,
  ExternalActionExecutionRelease,
  GmailDraftInput,
  GmailDraftPayload,
  GmailDraftResult,
  GmailSendInput,
  GmailSendPayload,
  GmailSendResult,
  ProviderActionEnvelope,
  ProviderActionFailure,
  ProviderConnectionSnapshot,
} from "@/contracts";
import { AccessTokenForConnectionError, AccessTokenForConnectionErrorCode, auth0 } from "@/auth";
import { getAuth0Environment } from "@/auth/env";
import { getGoogleConnectionSnapshot } from "@/connections/google";

type SupportedGoogleAction = CalendarAvailabilityResult | GmailDraftResult | GmailSendResult;

type GoogleActionKind = SupportedGoogleAction["kind"];

interface GoogleProviderActionContext {
  session: AuthSessionSnapshot;
  connection?: ProviderConnectionSnapshot;
  accessToken?: string | null;
  fetchFn?: typeof fetch;
}

interface GmailSendActionContext extends GoogleProviderActionContext {
  release?: ExternalActionExecutionRelease | null;
}

interface GoogleAccessResolution {
  connection: ProviderConnectionSnapshot;
  accessToken: string;
}

interface GoogleCalendarEventsResponse {
  summary?: string;
  timeZone?: string;
  items?: Array<{
    id?: string;
    status?: string;
    summary?: string;
    start?: {
      dateTime?: string;
      date?: string;
    };
    end?: {
      dateTime?: string;
      date?: string;
    };
    attendees?: Array<{
      email?: string;
    }>;
    hangoutLink?: string;
  }>;
}

interface GoogleDraftResponse {
  id?: string;
  message?: {
    id?: string;
    threadId?: string;
  };
}

interface GoogleSendResponse {
  id?: string;
  threadId?: string;
}

function buildEnvelope<Kind extends GoogleActionKind, Input, Payload>(
  input: Omit<ProviderActionEnvelope<Kind, Input, Payload>, "provider">,
): ProviderActionEnvelope<Kind, Input, Payload> {
  return {
    provider: "google",
    ...input,
  };
}

function buildFailure(code: ProviderActionFailure["code"], message: string, detail: string, retryable: boolean): ProviderActionFailure {
  return {
    code,
    message,
    detail,
    retryable,
  };
}

function buildConnectionResult<Kind extends GoogleActionKind, Input, Payload>(
  kind: Kind,
  label: string,
  request: Input,
  connection: ProviderConnectionSnapshot,
): ProviderActionEnvelope<Kind, Input, Payload> {
  if (connection.state === "not-connected") {
    return buildEnvelope<Kind, Input, Payload>({
      kind,
      state: "disconnected",
      connection,
      request,
      headline: `${label} cannot reach Google yet.`,
      detail: connection.detail,
      data: null,
      failure: buildFailure(
        "provider-disconnected",
        "Google is not connected through Auth0.",
        connection.detail,
        true,
      ),
      nextStep: connection.actionLabel ?? "Connect Google with Auth0.",
    });
  }

  if (connection.state === "pending") {
    return buildEnvelope<Kind, Input, Payload>({
      kind,
      state: "pending",
      connection,
      request,
      headline: `${label} is waiting for delegated Google access.`,
      detail: connection.detail,
      data: null,
      failure: buildFailure(
        "provider-pending",
        "Auth0 started the Google handoff, but the delegated path is not ready yet.",
        connection.detail,
        true,
      ),
      nextStep: "Finish the Auth0 provider handoff before retrying this action.",
    });
  }

  if (connection.state === "expired") {
    return buildEnvelope<Kind, Input, Payload>({
      kind,
      state: "unavailable",
      connection,
      request,
      headline: `${label} is blocked until Auth0 refreshes delegated Google access.`,
      detail: connection.detail,
      data: null,
      failure: buildFailure(
        "provider-expired",
        "The previous delegated Google access expired and must be refreshed before this action can run.",
        connection.detail,
        true,
      ),
      nextStep: connection.actionLabel ?? "Refresh the Auth0 session, then reconnect Google if needed.",
    });
  }

  return buildEnvelope<Kind, Input, Payload>({
    kind,
    state: "unavailable",
    connection,
    request,
    headline: `${label} cannot use delegated Google access right now.`,
    detail: connection.detail,
    data: null,
    failure: buildFailure(
      "provider-unavailable",
      "Auth0 could not provide a usable Google path for this action.",
      connection.detail,
      true,
    ),
    nextStep: connection.actionLabel ?? "Check the Auth0 and provider connection setup.",
  });
}

function buildTokenUnavailableResult<Kind extends GoogleActionKind, Input, Payload>(
  kind: Kind,
  label: string,
  request: Input,
  connection: ProviderConnectionSnapshot,
  detail: string,
): ProviderActionEnvelope<Kind, Input, Payload> {
  return buildEnvelope<Kind, Input, Payload>({
    kind,
    state: "unavailable",
    connection,
    request,
    headline: `${label} could not obtain delegated Google access.`,
    detail,
    data: null,
    failure: buildFailure(
      "token-unavailable",
      "Auth0 could not mint a delegated Google token for this action.",
      detail,
      true,
    ),
    nextStep: connection.actionLabel ?? "Reconnect Google through Auth0 or sign in again.",
  });
}

function buildProviderFailureResult<Kind extends GoogleActionKind, Input, Payload>(
  kind: Kind,
  label: string,
  request: Input,
  connection: ProviderConnectionSnapshot,
  failure: ProviderActionFailure,
  nextStep: string | null,
): ProviderActionEnvelope<Kind, Input, Payload> {
  return buildEnvelope<Kind, Input, Payload>({
    kind,
    state: "failed",
    connection,
    request,
    headline: `${label} reached Google but the provider request failed.`,
    detail: failure.detail,
    data: null,
    failure,
    nextStep,
  });
}

async function resolveConnection(
  session: AuthSessionSnapshot,
  providedConnection?: ProviderConnectionSnapshot,
): Promise<ProviderConnectionSnapshot> {
  return providedConnection ?? getGoogleConnectionSnapshot(session);
}

async function resolveGoogleAccess<Kind extends GoogleActionKind, Input, Payload>(
  kind: Kind,
  label: string,
  request: Input,
  context: GoogleProviderActionContext,
): Promise<
  | {
      result: ProviderActionEnvelope<Kind, Input, Payload>;
    }
  | {
      result: null;
      access: GoogleAccessResolution;
    }
> {
  const connection = await resolveConnection(context.session, context.connection);

  if (connection.state !== "connected") {
    return {
      result: buildConnectionResult<Kind, Input, Payload>(kind, label, request, connection),
    };
  }

  if (context.accessToken) {
    return {
      result: null,
      access: {
        connection,
        accessToken: context.accessToken,
      },
    };
  }

  const authEnv = getAuth0Environment();

  if (!authEnv.isConfigured || !auth0) {
    return {
      result: buildTokenUnavailableResult<Kind, Input, Payload>(
        kind,
        label,
        request,
        connection,
        "Auth0 is not fully configured, so the delegated Google token path is unavailable.",
      ),
    };
  }

  try {
    const accessToken = await auth0.getAccessTokenForConnection({
      connection: authEnv.googleConnectionName,
      login_hint: context.session.user?.email ?? undefined,
    });

    return {
      result: null,
      access: {
        connection,
        accessToken: accessToken.token,
      },
    };
  } catch (error) {
    if (error instanceof AccessTokenForConnectionError) {
      switch (error.code) {
        case AccessTokenForConnectionErrorCode.MISSING_SESSION:
          return {
            result: buildTokenUnavailableResult<Kind, Input, Payload>(
              kind,
              label,
              request,
              connection,
              "The Auth0 session is missing, so delegated Google access cannot be issued for this action.",
            ),
          };
        case AccessTokenForConnectionErrorCode.MISSING_REFRESH_TOKEN:
          return {
            result: buildTokenUnavailableResult<Kind, Input, Payload>(
              kind,
              label,
              request,
              connection,
              "Auth0 could not refresh delegated Google access. Sign in again to restore the provider path.",
            ),
          };
        case AccessTokenForConnectionErrorCode.FAILED_TO_EXCHANGE:
          return {
            result: buildTokenUnavailableResult<Kind, Input, Payload>(
              kind,
              label,
              request,
              connection,
              "Google is linked, but Auth0 could not exchange the connection into a delegated token for this action.",
            ),
          };
      }
    }

    return {
      result: buildTokenUnavailableResult<Kind, Input, Payload>(
        kind,
        label,
        request,
        connection,
        "Auth0 could not provide delegated Google access right now. Check the provider connection and try again.",
      ),
    };
  }
}

function buildGoogleHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function buildGoogleErrorDetail(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return fallback;
  }

  const error = payload.error;

  if (typeof error === "string") {
    return error;
  }

  if (!error || typeof error !== "object") {
    return fallback;
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

async function fetchGoogleJson<Response>(
  url: string,
  accessToken: string,
  fetchFn: typeof fetch,
  init: RequestInit,
): Promise<
  | {
      ok: true;
      payload: Response;
    }
  | {
      ok: false;
      code: ProviderActionFailure["code"];
      detail: string;
    }
> {
  try {
    const response = await fetchFn(url, {
      ...init,
      headers: {
        ...buildGoogleHeaders(accessToken),
        ...init.headers,
      },
    });
    const bodyText = await response.text();
    let payload: Response;

    try {
      payload = bodyText ? (JSON.parse(bodyText) as Response) : ({} as Response);
    } catch (error) {
      return {
        ok: false,
        code: "provider-response-invalid",
        detail:
          error instanceof Error
            ? `Google returned an invalid JSON payload: ${error.message}`
            : "Google returned an invalid JSON payload.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        code: "provider-request-failed",
        detail: buildGoogleErrorDetail(
          payload,
          `Google returned HTTP ${response.status} while handling this request.`,
        ),
      };
    }

    return {
      ok: true,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      code: "provider-request-failed",
      detail: error instanceof Error ? error.message : "The Google provider request failed unexpectedly.",
    };
  }
}

function toPreviewText(value: string): string {
  return value.length <= 140 ? value : `${value.slice(0, 137)}...`;
}

function escapeHeaderValue(value: string): string {
  return value.replace(/\r?\n/g, " ").trim();
}

function joinRecipients(values: string[]): string | null {
  return values.length ? values.join(", ") : null;
}

function buildMimeMessage(input: GmailDraftInput | GmailSendInput): string {
  const headers = [
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    `To: ${escapeHeaderValue(joinRecipients(input.to) ?? "")}`,
  ];

  const cc = joinRecipients(input.cc ?? []);
  const bcc = joinRecipients(input.bcc ?? []);

  if (cc) {
    headers.push(`Cc: ${escapeHeaderValue(cc)}`);
  }

  if (bcc) {
    headers.push(`Bcc: ${escapeHeaderValue(bcc)}`);
  }

  headers.push(`Subject: ${escapeHeaderValue(input.subject)}`);

  return `${headers.join("\r\n")}\r\n\r\n${input.bodyText}`;
}

function encodeGmailRawMessage(input: GmailDraftInput | GmailSendInput): string {
  return Buffer.from(buildMimeMessage(input), "utf8").toString("base64url");
}

export async function readCalendarAvailability(
  request: CalendarAvailabilityReadInput,
  context: GoogleProviderActionContext,
): Promise<CalendarAvailabilityResult> {
  const accessResult = await resolveGoogleAccess<"calendar.read", CalendarAvailabilityReadInput, CalendarAvailabilityPayload>(
    "calendar.read",
    "Calendar availability",
    request,
    context,
  );

  if (accessResult.result) {
    return accessResult.result;
  }

  const fetchFn = context.fetchFn ?? fetch;
  const calendarId = request.calendarId ?? "primary";
  const searchParams = new URLSearchParams({
    timeMin: request.startsAt,
    timeMax: request.endsAt,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(request.maxResults ?? 20),
  });

  const response = await fetchGoogleJson<GoogleCalendarEventsResponse>(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${searchParams.toString()}`,
    accessResult.access.accessToken,
    fetchFn,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    return buildProviderFailureResult(
      "calendar.read",
      "Calendar availability",
      request,
      accessResult.access.connection,
      buildFailure(
        response.code,
        "Google Calendar could not return the requested availability window.",
        response.detail,
        true,
      ),
      "Retry after confirming the Google connection and requested time window.",
    );
  }

  const payload: CalendarAvailabilityPayload = {
    calendarId,
    calendarLabel: response.payload.summary ?? calendarId,
    startsAt: request.startsAt,
    endsAt: request.endsAt,
    timeZone: request.timeZone ?? response.payload.timeZone ?? null,
    busySlots: (response.payload.items ?? [])
      .map((event) => ({
        startsAt: event.start?.dateTime ?? event.start?.date ?? "",
        endsAt: event.end?.dateTime ?? event.end?.date ?? "",
        summary: event.summary ?? "Busy",
      }))
      .filter((slot) => slot.startsAt && slot.endsAt),
    events: (response.payload.items ?? []).map((event) => ({
      id: event.id ?? "calendar-event",
      status: event.status ?? "confirmed",
      summary: event.summary ?? "Busy",
      startsAt: event.start?.dateTime ?? event.start?.date ?? null,
      endsAt: event.end?.dateTime ?? event.end?.date ?? null,
      attendees: (event.attendees ?? []).flatMap((attendee) => (attendee.email ? [attendee.email] : [])),
      hangoutLink: event.hangoutLink ?? null,
    })),
  };

  return buildEnvelope<"calendar.read", CalendarAvailabilityReadInput, CalendarAvailabilityPayload>({
    kind: "calendar.read",
    state: "success",
    connection: accessResult.access.connection,
    request,
    headline: "Calendar availability loaded through Auth0-backed Google access.",
    detail: "The Calendar Agent can now inspect the returned busy slots and events without relying on broad app credentials.",
    data: payload,
    failure: null,
    nextStep: null,
  });
}

export async function prepareGmailDraft(
  request: GmailDraftInput,
  context: GoogleProviderActionContext,
): Promise<GmailDraftResult> {
  const accessResult = await resolveGoogleAccess<"gmail.draft", GmailDraftInput, GmailDraftPayload>(
    "gmail.draft",
    "Gmail draft preparation",
    request,
    context,
  );

  if (accessResult.result) {
    return accessResult.result;
  }

  const fetchFn = context.fetchFn ?? fetch;
  const response = await fetchGoogleJson<GoogleDraftResponse>(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    accessResult.access.accessToken,
    fetchFn,
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          raw: encodeGmailRawMessage(request),
          threadId: request.threadId ?? undefined,
        },
      }),
    },
  );

  if (!response.ok) {
    return buildProviderFailureResult(
      "gmail.draft",
      "Gmail draft preparation",
      request,
      accessResult.access.connection,
      buildFailure(
        response.code,
        "Gmail could not create the requested draft.",
        response.detail,
        true,
      ),
      "Retry after checking the connected Google account and draft content.",
    );
  }

  const payload: GmailDraftPayload = {
    endpoint: "gmail.drafts.create",
    draftId: response.payload.id ?? null,
    messageId: response.payload.message?.id ?? null,
    threadId: response.payload.message?.threadId ?? request.threadId ?? null,
    to: [...request.to],
    cc: [...(request.cc ?? [])],
    bcc: [...(request.bcc ?? [])],
    subject: request.subject,
    previewText: toPreviewText(request.bodyText),
    createdAt: new Date().toISOString(),
  };

  return buildEnvelope<"gmail.draft", GmailDraftInput, GmailDraftPayload>({
    kind: "gmail.draft",
    state: "success",
    connection: accessResult.access.connection,
    request,
    headline: "Gmail draft prepared through Auth0-backed Google access.",
    detail: "The Comms Agent can hand this structured draft result to later approval or orchestration layers without conflating it with send.",
    data: payload,
    failure: null,
    nextStep: null,
  });
}

export async function executeSendEmail(
  request: GmailSendInput,
  context: GmailSendActionContext,
): Promise<GmailSendResult> {
  const connection = await resolveConnection(context.session, context.connection);

  if (connection.state !== "connected") {
    return buildConnectionResult("gmail.send", "Send email", request, connection);
  }

  if (!context.release?.execute) {
    return buildEnvelope<"gmail.send", GmailSendInput, GmailSendPayload>({
      kind: "gmail.send",
      state: "execution-blocked",
      connection,
      request,
      headline: "Send email remains blocked until another layer explicitly releases execution.",
      detail:
        "This boundary keeps draft preparation and live email sending separate. The provider path is visible, but this function will not send without an explicit execution release.",
      data: null,
      failure: buildFailure(
        "execution-release-required",
        "Live send execution needs an explicit release from an upstream control layer.",
        "Provide an execution release after approval or another user-visible control step decides the send may proceed.",
        true,
      ),
      nextStep: "Provide an explicit execution release before retrying the send boundary.",
    });
  }

  const accessResult = await resolveGoogleAccess<"gmail.send", GmailSendInput, GmailSendPayload>(
    "gmail.send",
    "Send email",
    request,
    {
      ...context,
      connection,
    },
  );

  if (accessResult.result) {
    return accessResult.result;
  }

  const fetchFn = context.fetchFn ?? fetch;
  const endpoint = request.draftId ? "gmail.drafts.send" : "gmail.messages.send";
  const url = request.draftId
    ? "https://gmail.googleapis.com/gmail/v1/users/me/drafts/send"
    : "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
  const body = request.draftId
    ? {
        id: request.draftId,
      }
    : {
        raw: encodeGmailRawMessage(request),
        threadId: request.threadId ?? undefined,
      };

  const response = await fetchGoogleJson<GoogleSendResponse>(
    url,
    accessResult.access.accessToken,
    fetchFn,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    return buildProviderFailureResult(
      "gmail.send",
      "Send email",
      request,
      accessResult.access.connection,
      buildFailure(
        response.code,
        "Gmail could not execute the requested send.",
        response.detail,
        true,
      ),
      "Retry after checking recipients, the connected Google account, and the upstream execution release.",
    );
  }

  const payload: GmailSendPayload = {
    endpoint,
    messageId: response.payload.id ?? null,
    threadId: response.payload.threadId ?? request.threadId ?? null,
    draftId: request.draftId ?? null,
    to: [...request.to],
    cc: [...(request.cc ?? [])],
    bcc: [...(request.bcc ?? [])],
    subject: request.subject,
    sentAt: new Date().toISOString(),
  };

  return buildEnvelope<"gmail.send", GmailSendInput, GmailSendPayload>({
    kind: "gmail.send",
    state: "success",
    connection: accessResult.access.connection,
    request,
    headline: "Email sent through Auth0-backed Google access.",
    detail: `The external send executed only after an explicit release from ${context.release.releasedBy}.`,
    data: payload,
    failure: null,
    nextStep: null,
  });
}
