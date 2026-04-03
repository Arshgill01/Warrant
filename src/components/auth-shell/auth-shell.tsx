import Link from "next/link";
import type {
  AuthSessionSnapshot,
  ProviderActionResult,
  ProviderConnectionSetupSnapshot,
  ProviderConnectionSnapshot,
} from "@/contracts";
import { SectionCard } from "@/components/foundation/section-card";
import { googleConnectionStateLegend } from "@/connections";

type AuthShellProps = {
  session: AuthSessionSnapshot;
  googleConnection: ProviderConnectionSnapshot;
  providerResults: ProviderActionResult[];
  googleSetup: ProviderConnectionSetupSnapshot;
};

const sessionTone: Record<AuthSessionSnapshot["state"], string> = {
  "signed-in": "bg-[var(--accent)] text-white",
  "signed-out": "bg-[var(--foreground)] text-white",
  unavailable: "bg-[#7d2e2c] text-white",
};

const connectionTone: Record<ProviderConnectionSnapshot["state"], string> = {
  connected: "bg-[var(--accent)] text-white",
  "not-connected": "bg-[var(--foreground)] text-white",
  pending: "bg-[#8a5b1f] text-white",
  expired: "bg-[#7b3a3a] text-white",
  unavailable: "bg-[#7d2e2c] text-white",
};

const providerResultTone: Record<ProviderActionResult["state"], string> = {
  success: "bg-[var(--accent-soft)] text-[var(--accent)]",
  pending: "bg-[#f4e6c8] text-[#8a5b1f]",
  disconnected: "bg-[#f3d9d6] text-[#7d2e2c]",
  unavailable: "bg-[#f3d9d6] text-[#7d2e2c]",
  failed: "bg-[#f3d9d6] text-[#7d2e2c]",
  "execution-blocked": "bg-[#ece6ff] text-[#5b4aa1]",
};

const providerActionLabels: Record<ProviderActionResult["kind"], string> = {
  "calendar.read": "Calendar availability",
  "gmail.draft": "Gmail draft",
  "gmail.send": "Send email",
};

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone}`}>
      {label}
    </span>
  );
}

function formatTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AuthAction({ href, label }: { href: string | null; label: string | null }) {
  if (!href || !label) {
    return null;
  }

  return (
    <a
      href={href}
      className="inline-flex w-fit rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
    >
      {label}
    </a>
  );
}

function formatProviderStateLabel(value: ProviderActionResult["state"]): string {
  return value.replaceAll("-", " ");
}

function renderProviderRequestSummary(result: ProviderActionResult): string {
  switch (result.kind) {
    case "calendar.read":
      return `${result.request.startsAt} to ${result.request.endsAt}`;
    case "gmail.draft":
    case "gmail.send":
      return result.request.to.join(", ");
  }
}

function renderProviderSuccessSummary(result: ProviderActionResult): string | null {
  if (result.state !== "success" || !result.data) {
    return null;
  }

  switch (result.kind) {
    case "calendar.read":
      return `${result.data.busySlots.length} busy slots from ${result.data.calendarLabel}`;
    case "gmail.draft":
      return `Draft ${result.data.draftId ?? "created"} for ${result.data.to.join(", ")}`;
    case "gmail.send":
      return `Endpoint ${result.data.endpoint} executed for ${result.data.to.join(", ")}`;
  }
}

function renderBlockerLabel(result: ProviderActionResult): string | null {
  if (result.state === "success") {
    return null;
  }

  if (result.state === "execution-blocked") {
    return "Blocked by explicit execution-release requirement.";
  }

  return "Blocked by Auth0-backed provider availability.";
}

function SetupRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-white/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function AuthShell({ session, googleConnection, providerResults, googleSetup }: AuthShellProps) {
  const sessionAction =
    session.state === "signed-in"
      ? { href: session.logoutHref, label: "Log out" }
      : { href: session.loginHref, label: "Continue with Auth0" };

  const googleAction = {
    href: googleConnection.actionHref,
    label: googleConnection.actionLabel,
  };

  const tokenExpiry = formatTimestamp(googleConnection.tokenExpiresAt);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
      <section className="grid gap-6 rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] p-8 shadow-[0_20px_80px_rgba(10,16,24,0.08)] backdrop-blur lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Auth0 Access Shell</p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>
            Delegated Google access should be obvious, constrained, and reversible.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            This shell makes Auth0 visible in the product story. Sign-in starts the app session, Google connects
            through Auth0, and external actions stay separate from local Warrant policy.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label={session.state.replace("-", " ")} tone={sessionTone[session.state]} />
            <StatusPill label={googleConnection.state.replace("-", " ")} tone={connectionTone[googleConnection.state]} />
            <Link
              href="/demo"
              className="inline-flex rounded-full border border-[var(--panel-border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Open demo scenario
            </Link>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-[var(--panel-border)] bg-white/70 p-5 shadow-[0_10px_30px_rgba(10,16,24,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Session</p>
              <h2 className="text-2xl font-semibold">{session.user?.name ?? "Auth0 shell"}</h2>
            </div>
            <StatusPill label={session.state.replace("-", " ")} tone={sessionTone[session.state]} />
          </div>
          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{session.headline}</p>
          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{session.detail}</p>
          {session.user?.email ? (
            <p className="mb-4 text-sm font-medium text-[var(--foreground)]">Signed-in email: {session.user.email}</p>
          ) : null}
          <AuthAction href={sessionAction.href} label={sessionAction.label} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
        <SectionCard title="Auth0 session" eyebrow="Identity gate">
          <div className="space-y-3">
            <StatusPill label={session.state.replace("-", " ")} tone={sessionTone[session.state]} />
            <p>{session.headline}</p>
            <p>{session.detail}</p>
            <AuthAction href={sessionAction.href} label={sessionAction.label} />
          </div>
        </SectionCard>

        <SectionCard title="Google through Auth0" eyebrow="Provider connection">
          <div className="space-y-3">
            <StatusPill label={googleConnection.state.replace("-", " ")} tone={connectionTone[googleConnection.state]} />
            <p>{googleConnection.headline}</p>
            <p>{googleConnection.detail}</p>
            {googleConnection.accountLabel ? (
              <p className="text-sm font-medium text-[var(--foreground)]">Connected account: {googleConnection.accountLabel}</p>
            ) : null}
            {tokenExpiry ? (
              <p className="text-sm font-medium text-[var(--foreground)]">Delegated token ready until: {tokenExpiry}</p>
            ) : null}
            <AuthAction href={googleAction.href} label={googleAction.label} />
          </div>
        </SectionCard>

        <SectionCard title="Two-layer enforcement" eyebrow="Boundary">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--accent-soft)] p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--foreground)]">Local Warrant policy</p>
              <p>Decides whether an agent should be allowed to attempt a category of action.</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-white/80 p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--foreground)]">Auth0-backed external access</p>
              <p>Decides whether the app can actually reach Gmail or Calendar through delegated Google access.</p>
            </div>
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Google Token Vault readiness" eyebrow="Connect contract">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <StatusPill
              label={googleSetup.status === "ready" ? "connect-ready" : "setup-required"}
              tone={googleSetup.status === "ready" ? "bg-[var(--accent)] text-white" : "bg-[#8a5b1f] text-white"}
            />
            <p>{googleSetup.headline}</p>
            <p>{googleSetup.detail}</p>
            <p className="text-sm leading-6 text-[var(--muted)]">
              This branch keeps the base session and provider connection inputs visible while the homepage exercises the
              live Calendar availability, Gmail draft, and send-email boundaries through Auth0-backed Google access.
            </p>
          </div>

          <div className="grid gap-3">
            <SetupRow label="Connection name" value={googleSetup.connectionName} />
            <SetupRow
              label="Auth params"
              value={googleSetup.requestedAuthParams.map((entry) => `${entry.key}=${entry.value}`).join(" ")}
            />
            <SetupRow label="Token Vault connection id" value={googleSetup.tokenVaultConnectionId ?? "Optional later"} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {googleSetup.requestedScopes.map((scope) => (
            <SetupRow key={scope} label="Delegated scope" value={scope} />
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-4 lg:grid-cols-3">
        {providerResults.map((result) => (
          <article
            key={result.kind}
            className="rounded-[1.6rem] border border-[var(--panel-border)] bg-white/75 p-5 shadow-[0_10px_30px_rgba(10,16,24,0.04)]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {result.connection.via.replaceAll("-", " ")}
                </p>
                <h2 className="text-2xl font-semibold">{providerActionLabels[result.kind]}</h2>
              </div>
              <StatusPill label={formatProviderStateLabel(result.state)} tone={providerResultTone[result.state]} />
            </div>
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">{result.headline}</p>
            <p className="mb-3 text-sm leading-6 text-[var(--muted)]">{result.detail}</p>
            <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Request: {renderProviderRequestSummary(result)}</p>
            <p className="mb-2 text-sm leading-6 text-[var(--muted)]">
              Provider state: {result.connection.state.replaceAll("-", " ")}
            </p>
            {renderProviderSuccessSummary(result) ? (
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">{renderProviderSuccessSummary(result)}</p>
            ) : null}
            {result.failure ? (
              <p className="mb-2 text-sm leading-6 text-[var(--muted)]">
                {result.failure.message} {result.failure.detail}
              </p>
            ) : null}
            {renderBlockerLabel(result) ? (
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">{renderBlockerLabel(result)}</p>
            ) : null}
            {result.failure ? (
              <p className="mb-2 text-sm leading-6 text-[var(--muted)]">Failure code: {result.failure.code}</p>
            ) : null}
            {result.nextStep ? <p className="text-sm font-medium text-[var(--foreground)]">Next: {result.nextStep}</p> : null}
          </article>
        ))}
      </section>

      <SectionCard title="Google states" eyebrow="Visible outcomes">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {googleConnectionStateLegend.map((state) => (
            <div key={state.state} className="rounded-2xl border border-[var(--panel-border)] bg-white/80 p-4">
              <div className="mb-3">
                <StatusPill label={state.label} tone={connectionTone[state.state]} />
              </div>
              <p>{state.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
