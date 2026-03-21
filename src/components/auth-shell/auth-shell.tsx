import Link from "next/link";
import type { ActionPathSnapshot, AuthSessionSnapshot, ProviderConnectionSnapshot } from "@/contracts";
import { SectionCard } from "@/components/foundation/section-card";
import { googleConnectionStateLegend } from "@/connections";

type AuthShellProps = {
  session: AuthSessionSnapshot;
  googleConnection: ProviderConnectionSnapshot;
  actionPaths: ActionPathSnapshot[];
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
  unavailable: "bg-[#7d2e2c] text-white",
};

const actionTone: Record<ActionPathSnapshot["state"], string> = {
  ready: "bg-[var(--accent-soft)] text-[var(--accent)]",
  pending: "bg-[#f4e6c8] text-[#8a5b1f]",
  blocked: "bg-[#f3d9d6] text-[#7d2e2c]",
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

export function AuthShell({ session, googleConnection, actionPaths }: AuthShellProps) {
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
              Open Wave 1 demo
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

      <section className="grid gap-4 lg:grid-cols-3">
        {actionPaths.map((actionPath) => (
          <article
            key={actionPath.kind}
            className="rounded-[1.6rem] border border-[var(--panel-border)] bg-white/75 p-5 shadow-[0_10px_30px_rgba(10,16,24,0.04)]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{actionPath.gate} gate</p>
                <h2 className="text-2xl font-semibold">{actionPath.label}</h2>
              </div>
              <StatusPill label={actionPath.state} tone={actionTone[actionPath.state]} />
            </div>
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">{actionPath.headline}</p>
            <p className="mb-3 text-sm leading-6 text-[var(--muted)]">{actionPath.detail}</p>
            {actionPath.nextStep ? <p className="text-sm font-medium text-[var(--foreground)]">Next: {actionPath.nextStep}</p> : null}
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
