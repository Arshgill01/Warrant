"use client";

import {
  startTransition,
  useCallback,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  buildSendApprovalBoundarySummary,
  buildSendApprovalStateMatrix,
} from "@/approvals";
import type {
  ActionPathSnapshot,
  DemoScenario,
  SendApprovalState,
} from "@/contracts";
import {
  createDelegationGraphView,
  createTimelineEventDisplayRecords,
  getDisplayScenarioExamples,
  revokeCommsBranchScenario,
} from "@/demo-fixtures";
import { DelegationGraph } from "@/graph";

const statusTone: Record<string, string> = {
  active: "bg-[var(--accent-soft)] text-[var(--accent)]",
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
}: ActionPathSnapshot & {
  eyebrow: string;
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

function toSendApprovalState(
  approvalStatus: "pending" | "approved" | "denied" | "expired",
): SendApprovalState {
  switch (approvalStatus) {
    case "approved":
      return "approved";
    case "denied":
      return "denied";
    case "expired":
      return "denied";
    case "pending":
    default:
      return "pending";
  }
}

function buildRevokedApprovalBoundarySummary(): {
  localEligibility: ActionPathSnapshot;
  approvalRequirement: ActionPathSnapshot;
  executionReadiness: ActionPathSnapshot;
} {
  return {
    localEligibility: {
      kind: "gmail.send",
      label: "Local Warrant eligibility",
      state: "blocked",
      gate: "policy",
      headline: "The Comms branch has been revoked.",
      detail:
        "Revocation beats prior local eligibility. This branch can no longer draft or send because its warrant authority is dead.",
      nextStep:
        "Issue a new child warrant if the planner should regain a bounded Comms branch.",
    },
    approvalRequirement: {
      kind: "gmail.send",
      label: "Auth0 approval requirement",
      state: "blocked",
      gate: "approval",
      headline: "The approval request is now historical only.",
      detail:
        "An Auth0 approval result cannot restore authority to a revoked branch. The request stays visible for audit, not execution.",
      nextStep: null,
    },
    executionReadiness: {
      kind: "gmail.send",
      label: "Final execution readiness",
      state: "blocked",
      gate: "policy",
      headline: "Live execution is blocked by revocation.",
      detail:
        "Warrant stops the branch before any approval release or provider execution can proceed.",
      nextStep: null,
    },
  };
}

export function DemoSurface({
  initialScenario,
  authConfigured,
}: {
  initialScenario: DemoScenario;
  authConfigured: boolean;
}) {
  const [scenario, setScenario] = useState(initialScenario);

  const graphView = useMemo(() => createDelegationGraphView(scenario), [scenario]);
  const timeline = useMemo(
    () => createTimelineEventDisplayRecords(scenario),
    [scenario],
  );
  const examples = useMemo(() => getDisplayScenarioExamples(scenario), [scenario]);
  const postRevokeAction = useMemo(
    () =>
      scenario.actionAttempts.find(
        (action) => action.authorization.code === "warrant_revoked",
      ) ?? null,
    [scenario],
  );
  const currentApprovalState = toSendApprovalState(
    examples.commsPendingApproval.status,
  );
  const commsBranchRevoked = examples.commsChildWarrant.status === "revoked";
  const approvalBoundaries = commsBranchRevoked
    ? buildRevokedApprovalBoundarySummary()
    : buildSendApprovalBoundarySummary(currentApprovalState);
  const approvalStateMatrix = buildSendApprovalStateMatrix();
  const agentCounts = useMemo(
    () =>
      scenario.agents.reduce<Record<string, number>>((counts, agent) => {
        counts[agent.status] = (counts[agent.status] ?? 0) + 1;
        return counts;
      }, {}),
    [scenario.agents],
  );

  const handleRevokeBranch = useCallback((warrantId: string) => {
    if (warrantId !== "warrant-comms-child-001") {
      return;
    }

    startTransition(() => {
      setScenario((current) => revokeCommsBranchScenario(current));
    });
  }, []);

  const currentApprovalBadge = commsBranchRevoked
    ? "current: pending + branch revoked"
    : `current: ${currentApprovalState}`;

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
          onRevoke={handleRevokeBranch}
          eyebrow="Visual Hierarchy"
          title="Delegation Tree"
          description="A real-time map of issued warrants and branch status. Select the Comms node to revoke that branch without affecting Calendar."
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
            detail={
              commsBranchRevoked
                ? "Maya revoked the Comms branch. Its prior send approval remains visible in history, but the branch can no longer execute."
                : "Planner Agent delegates bounded draft-plus-send authority, but the live send path is still paused behind Auth0 approval."
            }
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
            eyebrow={postRevokeAction ? "Post-Revoke Failure" : "Sensitive Send"}
            title={postRevokeAction ? postRevokeAction.summary : examples.commsSendAction.summary}
            statusKey={postRevokeAction ? postRevokeAction.outcome : examples.commsSendAction.outcome}
            statusLabel={(postRevokeAction ? postRevokeAction.outcome : examples.commsSendAction.outcome).replace("-", " ")}
            detail={postRevokeAction ? postRevokeAction.outcomeReason : examples.commsSendAction.outcomeReason}
            meta={
              postRevokeAction
                ? `Policy code: ${postRevokeAction.authorization.code}`
                : examples.commsPendingApproval.title
            }
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
            The Comms branch can draft the follow-up immediately. Sending the
            exact email below still requires an Auth0-backed approval result
            before Warrant can release the live Gmail execution path.
          </p>
        </div>

        {commsBranchRevoked ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-sm leading-relaxed text-rose-900">
            The approval request remains in the audit trail, but the Comms
            branch has been revoked. Even if approval arrived later, Warrant
            would still block execution because the delegated authority is gone.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] border border-[var(--panel-border)] bg-slate-50/60 p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Current approval request
                </p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  {examples.commsPendingApproval.title}
                </h3>
              </div>
              <StatusPill
                label={`${examples.commsPendingApproval.status} through ${examples.commsPendingApproval.provider}`}
                tone={statusTone[examples.commsPendingApproval.status]}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Why approval is needed
                </p>
                <p className="text-sm leading-relaxed text-[var(--foreground)]">
                  {examples.commsPendingApproval.reason}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Blast radius
                </p>
                <p className="text-sm leading-relaxed text-[var(--foreground)]">
                  {examples.commsPendingApproval.blastRadius}
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
                    {examples.commsPendingApproval.preview.subject}
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
                    To: {examples.commsPendingApproval.preview.to.join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    Cc: {examples.commsPendingApproval.preview.cc.join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    Draft: {examples.commsPendingApproval.preview.draftId ?? "none"}
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
                    {examples.commsPendingApproval.preview.bodyText}
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
              label={currentApprovalBadge}
              tone={commsBranchRevoked ? statusTone.revoked : statusTone[currentApprovalState]}
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
          <p className="text-sm text-[var(--muted)]">
            A cryptographic trail of issued warrants, approvals, revocations,
            and later action attempts.
          </p>
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
                    tone={
                      statusTone[event.kind.split(".")[1]] ||
                      statusTone[event.kind] ||
                      statusTone.revoked
                    }
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    {formatDateTime(event.at, scenario.timezone)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  {event.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  {event.description}
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-[var(--panel-border)] bg-slate-50/50 p-4 font-mono text-[10px] text-[var(--muted)] transition-all group-hover:bg-white md:min-w-[300px]">
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 pb-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Actor
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {event.actorLabel}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 py-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Warrant
                  </span>
                  <span className="font-semibold text-[var(--accent)]">
                    {event.warrantId ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Parent
                  </span>
                  <span className="font-semibold">
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
