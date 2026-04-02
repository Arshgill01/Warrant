import type { Metadata } from "next";
import Link from "next/link";
import { getAuth0Environment } from "@/auth/env";
import {
  buildSendApprovalBoundarySummary,
  buildSendApprovalStateMatrix,
} from "@/approvals";
import {
  createDefaultDemoScenario,
  createDelegationGraphView,
  loadDelegationGraphView,
  loadDemoState,
  loadScenarioExamples,
  loadTimelineEvents,
} from "@/demo-fixtures";
import { DelegationGraph } from "@/graph";

export const metadata: Metadata = {
  title: "Warrant | Wave 1 Demo",
  description: "Unified Wave 1 demo surface with the seeded scenario, delegation graph, and lineage-aware timeline.",
};

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

function formatStatusLabel(value: string): string {
  switch (value) {
    case "approval-required":
      return "needs approval";
    case "pending-approval":
      return "awaiting approval";
    case "warrant.issued":
      return "warrant granted";
    case "approval.requested":
      return "approval requested";
    default:
      return value.replaceAll("-", " ").replaceAll(".", " ");
  }
}

function formatApprovalBadge(status: string, provider: string): string {
  if (status === "pending") {
    return `pending in ${provider}`;
  }

  return `${formatStatusLabel(status)} in ${provider}`;
}

function formatGateLabel(value: string): string {
  switch (value) {
    case "policy":
      return "local warrant";
    case "approval":
      return "human approval";
    case "auth0":
      return "provider release";
    default:
      return value;
  }
}

function requireSummary(summary: ReturnType<typeof createDelegationGraphView>["warrantSummaries"][number] | undefined, message: string) {
  if (!summary) {
    throw new Error(message);
  }

  return summary;
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{eyebrow}</p>
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
        </div>
        <StatusPill label={statusLabel} tone={statusTone[statusKey] || statusTone.active} />
      </div>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      <div className="mt-4 flex items-center gap-2 border-t border-[var(--panel-border)] pt-4">
        <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--muted)]">Context:</span>
        <span className="text-xs font-medium text-[var(--foreground)]">{meta}</span>
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{eyebrow}</p>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{label}</h3>
        </div>
        <StatusPill label={state} tone={pathStateTone[state]} />
      </div>
      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">{headline}</p>
      <p className="mb-3 text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Checked by: {formatGateLabel(gate)}
      </p>
      {nextStep ? (
        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">Next: {nextStep}</p>
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
      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">{headline}</p>
      <p className="mb-3 text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      {nextStep ? (
        <p className="text-sm font-medium text-[var(--foreground)]">Next: {nextStep}</p>
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{eyebrow}</p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>
        </div>
        <StatusPill label={statusLabel} tone={statusTone[statusKey] || statusTone.active} />
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

export default function DemoPage() {
  const authEnv = getAuth0Environment();
  const scenario = loadDemoState();
  const graphView = loadDelegationGraphView();
  const timeline = loadTimelineEvents();
  const examples = loadScenarioExamples();
  const revokedScenario = createDefaultDemoScenario();
  const revokedCommsWarrant = revokedScenario.warrants.find(
    (warrant) => warrant.id === "warrant-comms-child-001",
  );

  if (!revokedCommsWarrant) {
    throw new Error("Missing comms warrant for revoked demo state.");
  }

  revokedCommsWarrant.status = "revoked";
  revokedCommsWarrant.revokedAt = "2026-04-17T09:15:00.000Z";
  revokedCommsWarrant.revocationReason =
    "Maya revoked the Comms branch. This agent can no longer act, and any descendants would lose authority immediately.";

  const expiredScenario = createDefaultDemoScenario();
  const expiredCalendarWarrant = expiredScenario.warrants.find(
    (warrant) => warrant.id === "warrant-calendar-child-001",
  );

  if (!expiredCalendarWarrant) {
    throw new Error("Missing calendar warrant for expired demo state.");
  }

  expiredCalendarWarrant.status = "expired";

  const revokedExample = requireSummary(
    createDelegationGraphView(revokedScenario).warrantSummaries.find(
      (summary) => summary.id === "warrant-comms-child-001",
    ),
    "Missing revoked comms summary.",
  );
  const expiredExample = requireSummary(
    createDelegationGraphView(expiredScenario).warrantSummaries.find(
      (summary) => summary.id === "warrant-calendar-child-001",
    ),
    "Missing expired calendar summary.",
  );
  const commsPolicyDenial =
    examples.commsChildWarrant.latestPolicyDenial ?? examples.commsOverreachAction;
  const currentApprovalState = "pending" as const;
  const approvalBoundaries = buildSendApprovalBoundarySummary(currentApprovalState);
  const approvalStateMatrix = buildSendApprovalStateMatrix();
  
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Delegated Authority Demo</p>
            <h1 className="text-4xl font-medium tracking-tight sm:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>
              Authorization needs <span className="italic">Warrants</span>.
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            Maya approves one parent warrant for Planner Agent. Planner can delegate only narrower child warrants, and each branch can be paused, denied, revoked, or expired independently.
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Root Warrant Approval</p>
            <h2 className="text-2xl font-semibold tracking-tight">{scenario.title}</h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{scenario.taskPrompt}</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
            Maya authorizes Planner Agent to handle this request and delegate only narrower child warrants for calendar and email work.
          </p>
          
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">Target Date</span>
              <span className="text-sm font-semibold">{formatDate(scenario.targetDate)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">Approved By</span>
              <span className="text-sm font-semibold">{scenario.user.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted)]">Parent Warrant</span>
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
          graphNodes={graphView.nodes}
          graphEdges={graphView.edges}
          warrantSummaries={graphView.warrantSummaries}
          eyebrow="Visual Hierarchy"
          title="Delegation Tree"
          description="A map of who received authority, what each branch can do, and which branches are paused, denied, revoked, or expired."
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ExampleCard
            eyebrow="Calendar Warrant"
            title={examples.calendarChildWarrant.purpose}
            statusKey={examples.calendarChildWarrant.status}
            statusLabel={formatStatusLabel(examples.calendarChildWarrant.status)}
            detail="Planner gives Calendar Agent one narrower calendar read for the April 18 window. It cannot draft or send email."
            meta={`Capabilities: ${examples.calendarChildWarrant.capabilities.join(", ")}`}
          />
          <ExampleCard
            eyebrow="Comms Warrant"
            title={examples.commsChildWarrant.purpose}
            statusKey={examples.commsChildWarrant.status}
            statusLabel={formatStatusLabel(examples.commsChildWarrant.status)}
            detail="Planner lets Comms Agent draft for approved recipients and request one send. It still cannot send a real email without approval."
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
            statusLabel="denied"
            detail={examples.commsOverreachAction.outcomeReason}
            meta={`Policy code: ${examples.commsOverreachAction.authorization.code}`}
          />
          <ExampleCard
            eyebrow="Sensitive Send"
            title={examples.commsSendAction.summary}
            statusKey={examples.commsSendAction.outcome}
            statusLabel={formatStatusLabel(examples.commsSendAction.outcome)}
            detail={examples.commsSendAction.outcomeReason}
            meta={examples.commsPendingApproval.title}
          />
        </div>
      </section>

      <section className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-slate-50/60 p-8 shadow-sm lg:p-12">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Proof Sequence</p>
          <h2 className="text-3xl font-semibold tracking-tight">One branch, two different gates.</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            The Comms branch can draft within its warrant, gets denied when it tries to overreach, and reaches approval only when it retries a send that stays inside its bounds.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <ProofStepCard
            eyebrow="Step 1"
            title="Bounded draft succeeds"
            statusKey={examples.commsDraftAction.outcome}
            statusLabel={formatStatusLabel(examples.commsDraftAction.outcome)}
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
            statusLabel={formatStatusLabel(examples.commsSendAction.outcome)}
            detail={examples.commsSendAction.outcomeReason}
            meta={[
              `Approval request: ${examples.commsPendingApproval.id}`,
              `Recipients: ${examples.commsPendingApproval.affectedRecipients.join(", ")}`,
              `Root request: ${examples.commsSendAction.rootRequestId}`,
            ]}
          />
        </div>
      </section>

      <section className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-white p-8 shadow-sm lg:p-12">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Sensitive Action Approval</p>
          <h2 className="text-3xl font-semibold tracking-tight">Draft authority is not send authority.</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            The Comms branch can draft immediately. Sending the exact email below still requires Maya to approve this reviewed message before Warrant can release the real Gmail send.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] border border-[var(--panel-border)] bg-slate-50/60 p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Exact email awaiting approval
                </p>
                <h3 className="text-2xl font-semibold tracking-tight">{examples.commsPendingApproval.title}</h3>
              </div>
              <StatusPill
                label={formatApprovalBadge(
                  examples.commsPendingApproval.status,
                  examples.commsPendingApproval.provider,
                )}
                tone={statusTone[examples.commsPendingApproval.status]}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Why approval is needed</p>
                <p className="text-sm leading-relaxed text-[var(--foreground)]">{examples.commsPendingApproval.reason}</p>
              </div>
              <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">If approved</p>
                <p className="text-sm leading-relaxed text-[var(--foreground)]">{examples.commsPendingApproval.blastRadius}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[var(--panel-border)] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Exact action preview</p>
                  <h4 className="text-lg font-semibold text-[var(--foreground)]">
                    {examples.commsPendingApproval.preview.subject}
                  </h4>
                </div>
                <StatusPill label="gmail.send" tone="bg-slate-900 text-white" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--panel-border)] bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Recipients</p>
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Body preview</p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]" style={{ fontFamily: "inherit" }}>
                    {examples.commsPendingApproval.preview.bodyText}
                  </pre>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4">
            <BoundaryCard
              eyebrow="Policy"
              label={approvalBoundaries.localEligibility.label}
              state={approvalBoundaries.localEligibility.state}
              gate={approvalBoundaries.localEligibility.gate}
              headline={approvalBoundaries.localEligibility.headline}
              detail={approvalBoundaries.localEligibility.detail}
              nextStep={approvalBoundaries.localEligibility.nextStep}
            />
            <BoundaryCard
              eyebrow="Approval"
              label={approvalBoundaries.approvalRequirement.label}
              state={approvalBoundaries.approvalRequirement.state}
              gate={approvalBoundaries.approvalRequirement.gate}
              headline={approvalBoundaries.approvalRequirement.headline}
              detail={approvalBoundaries.approvalRequirement.detail}
              nextStep={approvalBoundaries.approvalRequirement.nextStep}
            />
            <BoundaryCard
              eyebrow="Execution"
              label={approvalBoundaries.executionReadiness.label}
              state={approvalBoundaries.executionReadiness.state}
              gate={approvalBoundaries.executionReadiness.gate}
              headline={approvalBoundaries.executionReadiness.headline}
              detail={approvalBoundaries.executionReadiness.detail}
              nextStep={approvalBoundaries.executionReadiness.nextStep}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">State Model</p>
              <h3 className="text-2xl font-semibold tracking-tight">What changes when approval changes</h3>
            </div>
            <StatusPill label={`current: ${formatStatusLabel(currentApprovalState)}`} tone={statusTone[currentApprovalState]} />
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

      <section className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-white p-8 shadow-sm lg:p-12">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">End States</p>
          <h2 className="text-3xl font-semibold tracking-tight">When authority ends</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            Revocation and expiry do different jobs. Revocation is an explicit stop. Expiry is a time limit that shuts the warrant off once the window closes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ExampleCard
            eyebrow="Revoked Branch"
            title={`${revokedExample.agentLabel} branch`}
            statusKey={revokedExample.status}
            statusLabel={formatStatusLabel(revokedExample.status)}
            detail={revokedExample.statusReason}
            meta="What changes: this branch is dead immediately, and descendants lose authority with it."
          />
          <ExampleCard
            eyebrow="Expired Warrant"
            title={`${expiredExample.agentLabel} time limit`}
            statusKey={expiredExample.status}
            statusLabel={formatStatusLabel(expiredExample.status)}
            detail={expiredExample.statusReason}
            meta="What changes: new actions stop once the warrant's time window ends."
          />
        </div>
      </section>

      {/* 4. Lineage-Aware Timeline */}
      <section id="timeline" className="space-y-6 rounded-[2.5rem] border border-[var(--panel-border)] bg-slate-50/50 p-8 lg:p-12">
        <div className="mb-8 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Audit</p>
          <h2 className="text-3xl font-semibold tracking-tight">Authorization Timeline</h2>
          <p className="text-sm text-[var(--muted)]">A step-by-step record of who received authority, what they tried, and why the system allowed, paused, or denied it.</p>
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
                    label={formatStatusLabel(event.kind)} 
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
                  <span className="font-semibold text-[var(--foreground)]">{event.actorLabel}</span>
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
