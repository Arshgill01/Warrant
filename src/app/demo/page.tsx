import type { Metadata } from "next";
import Link from "next/link";
import { getAuth0Environment } from "@/auth/env";
import { SectionCard } from "@/components/foundation/section-card";
import {
  createDelegationNodes,
  createTimelineEvents,
  getScenarioExamples,
  loadDemoState,
} from "@/demo-fixtures";
import { DelegationGraph } from "@/graph";
import type { DemoActionOutcome, LedgerEventKind } from "@/contracts";

export const metadata: Metadata = {
  title: "Warrant | Wave 1 Demo",
  description: "Unified Wave 1 demo surface with the seeded scenario, delegation graph, and lineage-aware timeline.",
};

const exampleTone: Record<DemoActionOutcome | "revoked", string> = {
  allowed: "bg-[var(--accent-soft)] text-[var(--accent)]",
  blocked: "bg-[#f3d9d6] text-[#7d2e2c]",
  "approval-required": "bg-[#f4e6c8] text-[#8a5b1f]",
  revoked: "bg-slate-200 text-slate-700",
};

const timelineTone: Record<LedgerEventKind, string> = {
  "scenario.loaded": "bg-slate-100 text-slate-700",
  "warrant.issued": "bg-[var(--accent-soft)] text-[var(--accent)]",
  "action.allowed": "bg-[var(--accent-soft)] text-[var(--accent)]",
  "action.blocked": "bg-[#f3d9d6] text-[#7d2e2c]",
  "approval.requested": "bg-[#f4e6c8] text-[#8a5b1f]",
  "warrant.revoked": "bg-slate-200 text-slate-700",
};

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone}`}>
      {label}
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function ExampleCard({
  eyebrow,
  title,
  outcome,
  detail,
  meta,
}: {
  eyebrow: string;
  title: string;
  outcome: DemoActionOutcome | "revoked";
  detail: string;
  meta: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--panel-border)] bg-white/80 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{eyebrow}</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">{title}</h3>
        </div>
        <StatusPill label={outcome.replace("-", " ")} tone={exampleTone[outcome]} />
      </div>
      <p className="text-sm leading-6 text-[var(--muted)]">{detail}</p>
      <p className="mt-3 text-sm font-medium text-[var(--foreground)]">{meta}</p>
    </article>
  );
}

export default function DemoPage() {
  const authEnv = getAuth0Environment();
  const scenario = loadDemoState();
  const delegationNodes = createDelegationNodes(scenario);
  const timeline = createTimelineEvents(scenario);
  const examples = getScenarioExamples(scenario);
  const agentCounts = scenario.agents.reduce<Record<string, number>>((counts, agent) => {
    counts[agent.status] = (counts[agent.status] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
      <section className="grid gap-6 rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] p-8 shadow-[0_20px_80px_rgba(10,16,24,0.08)] backdrop-blur lg:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Wave 1 Demo Surface</p>
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>
            The merged Wave 1 pieces now read like one visible story.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            This route is fixture-backed on purpose. It shows the canonical seeded scenario, the delegation graph, and
            the lineage-aware event trail without requiring live Auth0 configuration to render.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label="fixture-backed /demo" tone="bg-[var(--accent)] text-white" />
            <StatusPill
              label={authEnv.isConfigured ? "auth-backed / ready" : "auth-backed / optional"}
              tone={authEnv.isConfigured ? "bg-[var(--foreground)] text-white" : "bg-slate-200 text-slate-700"}
            />
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-[var(--panel-border)] bg-white/70 p-5 shadow-[0_10px_30px_rgba(10,16,24,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Demo route summary</p>
          <h2 className="mt-2 text-2xl font-semibold">{scenario.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{scenario.taskPrompt}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--accent-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Target day</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{formatDate(scenario.targetDate)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Root actor</p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                {scenario.user.label} · {scenario.user.email}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
              Open auth/setup shell
            </Link>
            <a
              href="#timeline"
              className="inline-flex rounded-full border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Jump to timeline
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr_0.95fr]">
        <SectionCard title="Canonical seeded scenario" eyebrow="Fixture-backed">
          <p>
            Prompt owner: <strong>{scenario.user.label}</strong>
          </p>
          <p>Reference time: {formatDateTime(scenario.referenceTime, scenario.timezone)}</p>
          <p>Root warrant: {scenario.rootWarrantId}</p>
          <p>
            This page loads the in-repo demo fixtures directly, so the graph, event trail, and example outcomes stay
            deterministic across rehearsals.
          </p>
        </SectionCard>

        <SectionCard title="Auth-backed setup remains on /" eyebrow="Boundary">
          <p>
            The home route still owns sign-in, Google connection state, and the Auth0-backed external access shell.
          </p>
          {authEnv.isConfigured ? (
            <p>Local Auth0 environment values are present, so `/` can exercise the live setup path.</p>
          ) : (
            <p>Current demo machine is missing: {authEnv.missingValues.join(", ")}.</p>
          )}
          <p>
            `/demo` stays renderable anyway so judges can always see the delegation model, even when the live auth path
            is not configured.
          </p>
        </SectionCard>

        <SectionCard title="Visible Wave 1 proof points" eyebrow="Current surface">
          <p>Agents: {scenario.agents.length}</p>
          <p>Warrants: {scenario.warrants.length}</p>
          <p>Timeline events: {timeline.length}</p>
          <p>
            Status mix: {agentCounts.active ?? 0} active, {agentCounts.revoked ?? 0} revoked, {agentCounts.blocked ?? 0} blocked
          </p>
          <p>The graph below is no longer orphaned; it is driven by the same seeded scenario and warrant lineage as the timeline.</p>
        </SectionCard>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <DelegationGraph
          warrants={scenario.warrants}
          agents={scenario.agents}
          delegationNodes={delegationNodes}
          eyebrow="Fixture-backed graph"
          title="Delegation tree"
          description="Seeded warrants and statuses from the canonical Wave 1 scenario. Revoking a node still cascades through its branch."
        />

        <div className="grid gap-4 xl:sticky xl:top-6">
          <SectionCard title="Canonical beats" eyebrow="Scenario examples">
            <div className="grid gap-3">
              <ExampleCard
                eyebrow="Allowed child action"
                title={examples.validChildAction.summary}
                outcome={examples.validChildAction.outcome}
                detail={examples.validChildAction.outcomeReason}
                meta={`Resource: ${examples.validChildAction.resource}`}
              />
              <ExampleCard
                eyebrow="Blocked overreach"
                title={examples.blockedOverreachAction.summary}
                outcome={examples.blockedOverreachAction.outcome}
                detail={examples.blockedOverreachAction.outcomeReason}
                meta={`Attempted resource: ${examples.blockedOverreachAction.resource}`}
              />
              <ExampleCard
                eyebrow="Approval still pending"
                title={examples.approvalPendingRequest.title}
                outcome={examples.approvalPendingAction.outcome}
                detail={examples.approvalPendingRequest.reason}
                meta={`Blast radius: ${examples.approvalPendingRequest.blastRadius}`}
              />
              <ExampleCard
                eyebrow="Revoked branch"
                title="Descendant access cut off"
                outcome="revoked"
                detail={examples.revokedBranchRecord.reason}
                meta={`Cascades to: ${examples.revokedBranchRecord.cascadedWarrantIds.join(", ")}`}
              />
            </div>
          </SectionCard>
        </div>
      </section>

      <SectionCard title="Lineage-aware timeline" eyebrow="Fixture-backed events">
        <div id="timeline" className="space-y-3">
          {timeline.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-[var(--panel-border)] bg-white/80 p-4 shadow-[0_10px_30px_rgba(16,18,23,0.04)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={event.kind.replace(".", " ")} tone={timelineTone[event.kind]} />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {formatDateTime(event.at, scenario.timezone)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{event.title}</h3>
                  <p className="text-sm leading-6 text-[var(--muted)]">{event.description}</p>
                </div>
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-xs font-medium leading-6 text-[var(--muted)] md:min-w-[220px]">
                  <div>Actor: {event.actorId}</div>
                  <div>Warrant: {event.warrantId ?? "none"}</div>
                  <div>Parent: {event.parentWarrantId ?? "root"}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
