import type { Metadata } from "next";
import Link from "next/link";
import { getAuth0Environment } from "@/auth/env";
import {
  createDelegationNodes,
  createTimelineEvents,
  getScenarioExamples,
  loadDemoState,
} from "@/demo-fixtures";
import { DelegationGraph } from "@/graph";
import type { DemoActionOutcome } from "@/contracts";

export const metadata: Metadata = {
  title: "Warrant | Wave 1 Demo",
  description: "Unified Wave 1 demo surface with the seeded scenario, delegation graph, and lineage-aware timeline.",
};

const statusTone: Record<string, string> = {
  allowed: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)]",
  blocked: "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-text)]",
  "approval-required": "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)]",
  "warrant.issued": "bg-[var(--accent-soft)] text-[var(--accent)]",
  "scenario.loaded": "bg-slate-100 text-slate-700",
};

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
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
    <article className="group relative rounded-xl border border-[var(--panel-border)] bg-white p-5 transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{eyebrow}</p>
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
        </div>
        <StatusPill label={outcome.replace("-", " ")} tone={statusTone[outcome] || statusTone.revoked} />
      </div>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      <div className="mt-4 flex items-center gap-2 border-t border-[var(--panel-border)] pt-4">
        <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--muted)]">Context:</span>
        <span className="text-xs font-medium text-[var(--foreground)]">{meta}</span>
      </div>
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
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-6 py-10 sm:px-10 lg:px-16">
      {/* 1. Header & Scenario Summary */}
      <section className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Wave 1 Demo Surface</p>
            <h1 className="text-4xl font-medium tracking-tight sm:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>
              Authorization needs <span className="italic">Warrants</span>.
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            This surface demonstrates lineage-aware delegation for multi-agent systems. 
            Root agents spawn descendants with narrower, revocable authority.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label="fixture-backed demo" tone="bg-[var(--accent)] text-white" />
            <StatusPill
              label={authEnv.isConfigured ? "auth-ready" : "auth-optional"}
              tone={authEnv.isConfigured ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-8 shadow-sm backdrop-blur-sm">
          <div className="mb-6 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Current Scenario</p>
            <h2 className="text-2xl font-semibold tracking-tight">{scenario.title}</h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{scenario.taskPrompt}</p>
          
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">Target Date</span>
              <span className="text-sm font-semibold">{formatDate(scenario.targetDate)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">Root Actor</span>
              <span className="text-sm font-semibold">{scenario.user.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted)]">Root Warrant</span>
              <span className="font-mono text-[10px] font-bold text-[var(--accent)]">{scenario.rootWarrantId}</span>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Link
              href="/"
              className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-center text-xs font-bold text-white shadow-sm shadow-[var(--accent)]/10 transition-all hover:bg-emerald-800 active:scale-[0.98]"
            >
              Auth Setup
            </Link>
            <a
              href="#timeline"
              className="flex-1 rounded-xl border border-[var(--accent)] bg-white px-4 py-2.5 text-center text-xs font-bold text-[var(--accent)] shadow-sm transition-all hover:bg-[var(--accent-soft)] active:scale-[0.98]"
            >
              Audit Trail
            </a>
          </div>
        </div>
      </section>

      {/* 2. Full-Width Delegation Graph */}
      <section className="w-full">
        <DelegationGraph
          warrants={scenario.warrants}
          agents={scenario.agents}
          delegationNodes={delegationNodes}
          eyebrow="Visual Hierarchy"
          title="Delegation Tree"
          description="A real-time map of issued warrants and branch status. Select a node to inspect lineage and capabilities."
        />
      </section>

      {/* 3. Scenario Examples & Proof Points */}
      <section className="space-y-6">
        <div className="flex items-end justify-between px-2">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Verification</p>
            <h2 className="text-3xl font-semibold tracking-tight">Canonical Proof Points</h2>
          </div>
          <div className="flex gap-4 text-xs font-medium text-[var(--muted)]">
             <span>{agentCounts.active ?? 0} Active</span>
             <span>{agentCounts.revoked ?? 0} Revoked</span>
             <span>{agentCounts.blocked ?? 0} Blocked</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ExampleCard
            eyebrow="Allowed Action"
            title={examples.validChildAction.summary}
            outcome={examples.validChildAction.outcome}
            detail={examples.validChildAction.outcomeReason}
            meta={examples.validChildAction.resource}
          />
          <ExampleCard
            eyebrow="Policy Block"
            title={examples.blockedOverreachAction.summary}
            outcome={examples.blockedOverreachAction.outcome}
            detail={examples.blockedOverreachAction.outcomeReason}
            meta={examples.blockedOverreachAction.resource}
          />
          <ExampleCard
            eyebrow="Pending Approval"
            title={examples.approvalPendingRequest.title}
            outcome={examples.approvalPendingAction.outcome}
            detail={examples.approvalPendingRequest.reason}
            meta={`Radius: ${examples.approvalPendingRequest.blastRadius}`}
          />
          <ExampleCard
            eyebrow="Branch Revocation"
            title="Cascade Failure"
            outcome="revoked"
            detail={examples.revokedBranchRecord.reason}
            meta={`Cascades: ${examples.revokedBranchRecord.cascadedWarrantIds.length} nodes`}
          />
        </div>
      </section>

      {/* 4. Lineage-Aware Timeline */}
      <section id="timeline" className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-slate-50/50 p-8 lg:p-12">
        <div className="mb-8 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Audit</p>
          <h2 className="text-3xl font-semibold tracking-tight">Lineage-Aware Timeline</h2>
          <p className="text-sm text-[var(--muted)]">A cryptographic trail of all issued warrants and action attempts.</p>
        </div>

        <div className="space-y-4">
          {timeline.map((event) => (
            <article
              key={event.id}
              className="group flex flex-col gap-6 rounded-2xl border border-[var(--panel-border)] bg-white p-6 shadow-sm transition-all hover:border-[var(--muted)]/20 hover:shadow-md md:flex-row md:items-center"
            >
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill 
                    label={event.kind.replace(".", " ")} 
                    tone={statusTone[event.kind.split(".")[1]] || statusTone[event.kind] || statusTone.revoked} 
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    {formatDateTime(event.at, scenario.timezone)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] tracking-tight">{event.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">{event.description}</p>
              </div>
              
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--panel-border)] bg-slate-50/50 p-4 font-mono text-[10px] text-[var(--muted)] transition-all group-hover:bg-white md:min-w-[300px]">
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 pb-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">Actor</span>
                  <span className="font-semibold text-[var(--foreground)]">{event.actorId}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 py-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">Warrant</span>
                  <span className="font-semibold text-[var(--accent)]">{event.warrantId ?? "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">Parent</span>
                  <span className="font-semibold">{event.parentWarrantId ?? "root"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
