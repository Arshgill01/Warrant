"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  buildSendApprovalBoundarySummary,
  buildSendApprovalStateMatrix,
  mapApprovalStatusToSendApprovalState,
} from "@/approvals";
import type { DemoScenario } from "@/contracts";
import {
  createDelegationGraphView,
  createTimelineEventDisplayRecords,
  getDisplayScenarioExamples,
} from "@/demo-fixtures";
import { DelegationGraph } from "@/graph";

const statusTone: Record<string, string> = {
  active: "bg-[var(--accent-soft)] text-[var(--accent)]",
  info: "bg-slate-100 text-slate-700",
  allowed: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)]",
  blocked: "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-text)]",
  denied: "bg-rose-50 text-rose-700",
  "approval-required": "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  "pending-approval": "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  approved: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)]",
  expired: "bg-slate-100 text-slate-600",
  revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)]",
  "warrant.issued": "bg-[var(--accent-soft)] text-[var(--accent)]",
  "scenario.loaded": "bg-slate-100 text-slate-700",
  "approval.requested": "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
};

const pathStateTone: Record<"ready" | "blocked" | "pending", string> = {
  ready: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)]",
  blocked: "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-text)]",
  pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
};

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}
    >
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
  statusKey,
  statusLabel,
  detail,
  meta,
}: {
  eyebrow: string;
  title: string;
  statusKey: string;
  statusLabel: string;
  detail: string;
  meta: string;
}) {
  return (
    <article className="group relative rounded-xl border border-[var(--panel-border)] bg-white p-5 transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
            {eyebrow}
          </p>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </h3>
        </div>
        <StatusPill
          label={statusLabel}
          tone={statusTone[statusKey] || statusTone.active}
        />
      </div>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      <div className="mt-4 flex items-center gap-2 border-t border-[var(--panel-border)] pt-4">
        <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--muted)]">
          Context:
        </span>
        <span className="text-xs font-medium text-[var(--foreground)]">
          {meta}
        </span>
      </div>
    </article>
  );
}

function BoundaryCard({
  eyebrow,
  label,
  state,
  gate,
  headline,
  detail,
  nextStep,
}: {
  eyebrow: string;
  label: string;
  state: "ready" | "blocked" | "pending";
  gate: string;
  headline: string;
  detail: string;
  nextStep: string | null;
}) {
  return (
    <article className="rounded-2xl border border-[var(--panel-border)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {label}
          </h3>
        </div>
        <StatusPill label={state} tone={pathStateTone[state]} />
      </div>
      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
        {headline}
      </p>
      <p className="mb-3 text-sm leading-relaxed text-[var(--muted)]">
        {detail}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Gate: {gate}
      </p>
      {nextStep ? (
        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
          Next: {nextStep}
        </p>
      ) : null}
    </article>
  );
}

function ApprovalStateCard({
  label,
  headline,
  detail,
  nextStep,
  executionReady,
  isCurrent,
}: {
  label: string;
  headline: string;
  detail: string;
  nextStep: string | null;
  executionReady: boolean;
  isCurrent: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${
        isCurrent
          ? "border-[var(--accent)] bg-[var(--accent-soft)]/40"
          : "border-[var(--panel-border)] bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <StatusPill
          label={executionReady ? "execution ready" : "still blocked"}
          tone={executionReady ? statusTone.approved : statusTone.blocked}
        />
      </div>
      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
        {headline}
      </p>
      <p className="mb-3 text-sm leading-relaxed text-[var(--muted)]">
        {detail}
      </p>
      {nextStep ? (
        <p className="text-sm font-medium text-[var(--foreground)]">
          Next: {nextStep}
        </p>
      ) : null}
    </article>
  );
}

function ProofStepCard({
  eyebrow,
  title,
  statusKey,
  statusLabel,
  detail,
  meta,
}: {
  eyebrow: string;
  title: string;
  statusKey: string;
  statusLabel: string;
  detail: string;
  meta: string[];
}) {
  return (
    <article className="rounded-[1.75rem] border border-[var(--panel-border)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </h3>
        </div>
        <StatusPill
          label={statusLabel}
          tone={statusTone[statusKey] || statusTone.active}
        />
      </div>
      <p className="text-sm leading-relaxed text-[var(--foreground)]">{detail}</p>
      <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        {meta.map((item) => (
          <p key={item} className="text-xs font-medium text-[var(--muted)]">
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}

export function DemoSurface({
  initialScenario,
  authConfigured,
}: {
  initialScenario: DemoScenario;
  authConfigured: boolean;
}) {
  const scenario = initialScenario;
  const graphView = useMemo(() => createDelegationGraphView(scenario), [scenario]);
  const timeline = useMemo(
    () => createTimelineEventDisplayRecords(scenario),
    [scenario],
  );
  const examples = useMemo(() => getDisplayScenarioExamples(scenario), [scenario]);
  const commsPolicyDenial =
    examples.commsChildWarrant.latestPolicyDenial ?? examples.commsOverreachAction;
  const currentApprovalState = mapApprovalStatusToSendApprovalState(
    examples.commsSendApproval.status,
  );
  const approvalBoundaries = buildSendApprovalBoundarySummary(currentApprovalState);
  const approvalStateMatrix = buildSendApprovalStateMatrix();
  const agentCounts = useMemo(
    () =>
      scenario.agents.reduce<Record<string, number>>((counts, agent) => {
        counts[agent.status] = (counts[agent.status] ?? 0) + 1;
        return counts;
      }, {}),
    [scenario.agents],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-6 py-10 sm:px-10 lg:px-16">
      <section className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Wave 1 Demo Surface
            </p>
            <h1
              className="text-4xl font-medium tracking-tight sm:text-6xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Authorization needs <span className="italic">Warrants</span>.
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            This surface demonstrates lineage-aware delegation for multi-agent
            systems. Root agents spawn descendants with narrower, revocable
            authority.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill
              label="fixture-backed demo"
              tone="bg-[var(--accent)] text-white"
            />
            <StatusPill
              label={authConfigured ? "auth-ready" : "auth-optional"}
              tone={
                authConfigured
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-8 shadow-sm backdrop-blur-sm">
          <div className="mb-6 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Current Scenario
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {scenario.title}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {scenario.taskPrompt}
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">
                Target Date
              </span>
              <span className="text-sm font-semibold">
                {formatDate(scenario.targetDate)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">
                Root Actor
              </span>
              <span className="text-sm font-semibold">
                {scenario.user.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted)]">
                Root Warrant
              </span>
              <span className="font-mono text-[10px] font-bold text-[var(--accent)]">
                {scenario.rootWarrantId}
              </span>
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

      <section className="w-full">
        <DelegationGraph
          graphNodes={graphView.nodes}
          graphEdges={graphView.edges}
          warrantSummaries={graphView.warrantSummaries}
          eyebrow="Visual Hierarchy"
          title="Delegation Tree"
          description="A real-time map of issued warrants and branch status. Select a node to inspect lineage and capabilities."
        />
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between px-2">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Verification
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Canonical Proof Points
            </h2>
          </div>
          <div className="flex gap-4 text-xs font-medium text-[var(--muted)]">
            <span>{agentCounts.active ?? 0} Active</span>
            <span>{agentCounts.revoked ?? 0} Revoked</span>
            <span>{agentCounts.blocked ?? 0} Blocked</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ExampleCard
            eyebrow="Calendar Warrant"
            title={examples.calendarChildWarrant.purpose}
            statusKey={examples.calendarChildWarrant.status}
            statusLabel={examples.calendarChildWarrant.status}
            detail="Planner Agent delegates a narrower calendar-read warrant with a bounded April 18 time window."
            meta={`Capabilities: ${examples.calendarChildWarrant.capabilities.join(", ")}`}
          />
          <ExampleCard
            eyebrow="Comms Warrant"
            title={examples.commsChildWarrant.purpose}
            statusKey={examples.commsChildWarrant.status}
            statusLabel={examples.commsChildWarrant.status}
            detail="Planner Agent delegates bounded draft-plus-send authority, but the branch is later revoked after the approved send so its authority cannot continue."
            meta={`Capabilities: ${examples.commsChildWarrant.capabilities.join(", ")}`}
          />
          <ExampleCard
            eyebrow="Allowed Action"
            title={examples.calendarAction.summary}
            statusKey={examples.calendarAction.outcome}
            statusLabel={examples.calendarAction.outcome.replace("-", " ")}
            detail={examples.calendarAction.outcomeReason}
            meta={examples.calendarAction.resource}
          />
          <ExampleCard
            eyebrow="Allowed Action"
            title={examples.commsDraftAction.summary}
            statusKey={examples.commsDraftAction.outcome}
            statusLabel={examples.commsDraftAction.outcome.replace("-", " ")}
            detail={examples.commsDraftAction.outcomeReason}
            meta={examples.commsDraftAction.resource}
          />
          <ExampleCard
            eyebrow="Blocked Overreach"
            title={examples.commsOverreachAction.summary}
            statusKey={examples.commsOverreachAction.outcome}
            statusLabel={examples.commsOverreachAction.outcome.replace("-", " ")}
            detail={examples.commsOverreachAction.outcomeReason}
            meta={`Policy code: ${examples.commsOverreachAction.authorization.code}`}
          />
          <ExampleCard
            eyebrow="Sensitive Send"
            title={examples.commsSendAction.summary}
            statusKey={examples.commsSendAction.outcome}
            statusLabel={examples.commsSendAction.outcome.replace("-", " ")}
            detail={examples.commsSendAction.outcomeReason}
            meta={examples.commsSendApproval.title}
          />
        </div>
      </section>

      <section className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-slate-50/60 p-8 shadow-sm lg:p-12">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Proof Sequence
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            One branch, two different gates.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            The Comms branch succeeds at bounded drafting, gets denied immediately when it overreaches local recipient policy,
            and only reaches Auth0 approval when it retries a send that stays inside the warrant&apos;s bounds.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <ProofStepCard
            eyebrow="Step 1"
            title="Bounded draft succeeds"
            statusKey={examples.commsDraftAction.outcome}
            statusLabel={examples.commsDraftAction.outcome.replace("-", " ")}
            detail={examples.commsDraftAction.outcomeReason}
            meta={[
              `Action: ${examples.commsDraftAction.kind}`,
              `Warrant: ${examples.commsDraftAction.warrantId}`,
              `Resource: ${examples.commsDraftAction.resource}`,
            ]}
          />
          <ProofStepCard
            eyebrow="Step 2"
            title="Overreach is denied by local warrant policy"
            statusKey="denied"
            statusLabel="policy denied"
            detail={commsPolicyDenial.outcomeReason}
            meta={[
              `Decision code: ${commsPolicyDenial.authorization.code}`,
              `Blocked by warrant: ${commsPolicyDenial.authorization.blockedByWarrantId ?? commsPolicyDenial.warrantId}`,
              `Parent warrant: ${commsPolicyDenial.parentWarrantId ?? "root"}`,
            ]}
          />
          <ProofStepCard
            eyebrow="Step 3"
            title="Allowed send pauses for approval instead"
            statusKey={examples.commsSendAction.outcome}
            statusLabel={examples.commsSendAction.outcome.replace("-", " ")}
            detail={examples.commsSendAction.outcomeReason}
            meta={[
              `Approval request: ${examples.commsSendApproval.id}`,
              `Recipients: ${examples.commsSendApproval.affectedRecipients.join(", ")}`,
              `Root request: ${examples.commsSendAction.rootRequestId}`,
            ]}
          />
        </div>
      </section>

      <section className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-white p-8 shadow-sm lg:p-12">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Sensitive Action Approval
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Draft authority is not send authority.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            The Comms branch could draft immediately, then needed explicit Auth0 approval before the live send executed.
            The same branch was revoked afterward, which is why the audit timeline matters as much as the approval card.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] border border-[var(--panel-border)] bg-slate-50/60 p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Approval control moment
                </p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  {examples.commsSendApproval.title}
                </h3>
              </div>
              <StatusPill
                label={`${examples.commsSendApproval.status} through ${examples.commsSendApproval.provider}`}
                tone={statusTone[examples.commsSendApproval.status]}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Why approval is needed
                </p>
                <p className="text-sm leading-relaxed text-[var(--foreground)]">
                  {examples.commsSendApproval.reason}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Blast radius
                </p>
                <p className="text-sm leading-relaxed text-[var(--foreground)]">
                  {examples.commsSendApproval.blastRadius}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[var(--panel-border)] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Exact action preview
                  </p>
                  <h4 className="text-lg font-semibold text-[var(--foreground)]">
                    {examples.commsSendApproval.preview.subject}
                  </h4>
                </div>
                <StatusPill label="gmail.send" tone="bg-slate-900 text-white" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--panel-border)] bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Recipients
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    To: {examples.commsSendApproval.preview.to.join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    Cc: {examples.commsSendApproval.preview.cc.join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    Draft: {examples.commsSendApproval.preview.draftId ?? "none"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Body preview
                  </p>
                  <pre
                    className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]"
                    style={{ fontFamily: "inherit" }}
                  >
                    {examples.commsSendApproval.preview.bodyText}
                  </pre>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4">
            <BoundaryCard eyebrow="Policy" {...approvalBoundaries.localEligibility} />
            <BoundaryCard eyebrow="Approval" {...approvalBoundaries.approvalRequirement} />
            <BoundaryCard eyebrow="Execution" {...approvalBoundaries.executionReadiness} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                State Model
              </p>
              <h3 className="text-2xl font-semibold tracking-tight">
                What changes when approval changes
              </h3>
            </div>
            <StatusPill
              label={`current: ${currentApprovalState}`}
              tone={statusTone[currentApprovalState]}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {approvalStateMatrix.map((state) => (
              <ApprovalStateCard
                key={state.state}
                label={state.label}
                headline={state.headline}
                detail={state.detail}
                nextStep={state.nextStep}
                executionReady={state.executionReady}
                isCurrent={state.state === currentApprovalState}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        id="timeline"
        className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-slate-50/50 p-8 lg:p-12"
      >
        <div className="mb-8 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Audit
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Lineage-Aware Timeline
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            A concise ledger of who acted, which warrant branch they acted under, and why the system allowed,
            paused, approved, revoked, or blocked each step.
          </p>
        </div>

        <div className="space-y-4">
          {timeline.map((event, index) => (
            <article
              key={event.id}
              className="group grid gap-5 rounded-2xl border border-[var(--panel-border)] bg-white p-6 shadow-sm transition-all hover:border-[var(--muted)]/20 hover:shadow-md lg:grid-cols-[88px_minmax(0,1fr)_320px]"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Step {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  {formatDateTime(event.at, scenario.timezone)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill
                    label={`${event.kindLabel} ${event.resultLabel}`}
                    tone={statusTone[event.resultTone]}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {event.branchLabel}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  {event.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {event.description}
                </p>
              </div>

              <div className="grid gap-2 rounded-2xl border border-[var(--panel-border)] bg-slate-50/60 p-4 text-[11px] text-[var(--muted)] transition-all group-hover:bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)]/70 pb-2">
                  <span className="font-bold uppercase tracking-[0.18em]">
                    Actor
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {event.actorLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)]/70 py-2">
                  <span className="font-bold uppercase tracking-[0.18em]">
                    Branch
                  </span>
                  <span className="text-right font-semibold text-[var(--foreground)]">
                    {event.branchLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)]/70 py-2">
                  <span className="font-bold uppercase tracking-[0.18em]">
                    Warrant
                  </span>
                  <span className="font-mono font-semibold text-[var(--accent)]">
                    {event.warrantId ?? "root"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="font-bold uppercase tracking-[0.18em]">
                    Parent
                  </span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">
                    {event.parentWarrantId ?? "root"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
