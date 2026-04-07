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
import { DemoLivePreflightCard } from "@/components/demo/demo-live-preflight-card";
import { DemoRehearsalControls } from "@/components/demo/demo-rehearsal-controls";
import { StatusChip } from "@/components/foundation/status-chip";
import type {
  ActionPathSnapshot,
  DemoScenario,
  SendApprovalState,
} from "@/contracts";
import type { DemoRehearsalSnapshot } from "@/demo-fixtures/state";
import {
  createActionAttemptDisplayRecords,
  createCommsRevokedDemoScenario,
  createMainDemoScenario,
  createDelegationGraphView,
  createTimelineEventDisplayRecords,
  getDisplayScenarioExamples,
  revokeCommsBranchScenario,
} from "@/demo-fixtures";
import { DelegationGraph } from "@/graph";

const statusTone: Record<string, string> = {
  active: "bg-[var(--accent-soft)] text-[var(--accent)]",
  denied_policy: "bg-rose-50 text-rose-700",
  approval_required: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  approval_pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  approval_approved: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)]",
  approval_denied: "bg-rose-50 text-rose-700",
  blocked_revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)]",
  blocked_expired: "bg-slate-100 text-slate-600",
  provider_unavailable: "bg-amber-50 text-amber-700",
  blocked: "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-text)]",
  expired: "bg-slate-100 text-slate-600",
  revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)]",
  info: "bg-slate-100 text-slate-700",
};

const pathStateTone: Record<"ready" | "blocked" | "pending", string> = {
  ready: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)]",
  blocked: "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-text)]",
  pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
};

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
    case "denied_policy":
      return "policy denied";
    case "approval_required":
      return "approval required";
    case "approval_pending":
      return "approval pending";
    case "approval_approved":
      return "approval approved";
    case "approval_denied":
      return "approval denied";
    case "blocked_revoked":
      return "blocked by revocation";
    case "blocked_expired":
      return "blocked by expiry";
    case "provider_unavailable":
      return "provider unavailable";
    default:
      return value.replaceAll("_", " ").replaceAll("-", " ").replaceAll(".", " ");
  }
}

function formatApprovalBadge(status: string, provider: string): string {
  if (status === "approval_pending") {
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

function requireSummary<
  Summary extends ReturnType<typeof createDelegationGraphView>["warrantSummaries"][number],
>(summary: Summary | undefined, message: string): Summary {
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
    <article className="surface-card group relative p-5 transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
            {eyebrow}
          </p>
          <h3 className="break-words text-base font-semibold text-[var(--foreground)]">
            {title}
          </h3>
        </div>
        <StatusChip
          label={statusLabel}
          tone={statusTone[statusKey] || statusTone.active}
        />
      </div>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{detail}</p>
      <div className="mt-4 flex items-start gap-2 border-t border-[var(--panel-border)] pt-4">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-tight text-[var(--muted)]">
          Context:
        </span>
        <span className="min-w-0 break-words text-xs font-medium text-[var(--foreground)]">
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
    <article className="surface-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {label}
          </h3>
        </div>
        <StatusChip label={state} tone={pathStateTone[state]} />
      </div>
      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
        {headline}
      </p>
      <p className="mb-3 text-sm leading-relaxed text-[var(--muted)]">
        {detail}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Checked by: {formatGateLabel(gate)}
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
      className={`surface-card p-5 ${
        isCurrent
          ? "border-[var(--accent)] bg-[var(--accent-soft)]/40"
          : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <StatusChip
          label={executionReady ? "execution ready" : "still blocked"}
          tone={executionReady ? statusTone.approval_approved : statusTone.blocked}
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
      label: "Local warrant check",
      state: "blocked",
      gate: "policy",
      headline: "This branch has been revoked.",
      detail:
        "Revocation overrides any earlier eligibility. This branch can no longer draft or send because its warrant authority is gone.",
      nextStep:
        "Issue a new child warrant if the planner should regain a bounded Comms branch.",
    },
    approvalRequirement: {
      kind: "gmail.send",
      label: "Human approval check",
      state: "blocked",
      gate: "approval",
      headline: "The approval record is now historical only.",
      detail:
        "An Auth0 approval result cannot restore authority to a revoked branch. The request remains visible for audit, not execution.",
      nextStep: null,
    },
    executionReadiness: {
      kind: "gmail.send",
      label: "Real send release",
      state: "blocked",
      gate: "policy",
      headline: "The real Gmail send is blocked by revocation.",
      detail:
        "Warrant stops the branch before any approval release or provider execution can proceed.",
      nextStep: null,
    },
  };
}

function createScenarioFromPreset(
  preset: DemoRehearsalSnapshot["preset"],
): DemoScenario {
  switch (preset) {
    case "main":
      return createMainDemoScenario();
    case "comms-revoked":
      return createCommsRevokedDemoScenario();
  }
}

function scenariosAreEqual(left: DemoScenario, right: DemoScenario): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

type RehearsalControlsState = Pick<
  DemoRehearsalSnapshot,
  | "kind"
  | "preset"
  | "label"
  | "description"
  | "updatedAt"
  | "controlsEnabled"
  | "recoveredFromInvalidState"
  | "recoveryReason"
  | "presets"
>;

export function deriveRehearsalControlsState(input: {
  rehearsal: DemoRehearsalSnapshot;
  scenario: DemoScenario;
}): RehearsalControlsState {
  const presetScenario = createScenarioFromPreset(input.rehearsal.preset);
  const divergedFromPreset =
    input.rehearsal.kind === "preset" &&
    !scenariosAreEqual(input.scenario, presetScenario);

  if (!divergedFromPreset) {
    return input.rehearsal;
  }

  return {
    ...input.rehearsal,
    kind: "custom",
    label: `Custom state (modified from ${input.rehearsal.label})`,
    description:
      "This view diverged from the selected preset after an in-page change. Restore a preset to return to canonical rehearsal state.",
  };
}

export function DemoSurface({
  initialScenario,
  authConfigured,
  rehearsal,
}: {
  initialScenario: DemoScenario;
  authConfigured: boolean;
  rehearsal?: DemoRehearsalSnapshot | null;
}) {
  const [scenario, setScenario] = useState(initialScenario);

  const graphView = useMemo(() => createDelegationGraphView(scenario), [scenario]);
  const revokedScenario = useMemo(() => createCommsRevokedDemoScenario(), []);
  const expiredScenario = useMemo(() => {
    const nextScenario = createCommsRevokedDemoScenario();
    const calendarWarrant = nextScenario.warrants.find(
      (warrant) => warrant.id === "warrant-calendar-child-001",
    );

    if (!calendarWarrant) {
      throw new Error("Missing calendar warrant for expired example.");
    }

    calendarWarrant.status = "expired";
    calendarWarrant.revokedAt = null;
    calendarWarrant.revocationReason = null;
    calendarWarrant.revocationSourceId = null;
    calendarWarrant.revokedBy = null;

    return nextScenario;
  }, []);
  const timeline = useMemo(
    () => createTimelineEventDisplayRecords(scenario),
    [scenario],
  );
  const actionRecords = useMemo(
    () => createActionAttemptDisplayRecords(scenario),
    [scenario],
  );
  const examples = useMemo(() => getDisplayScenarioExamples(scenario), [scenario]);
  const revokedExample = useMemo(
    () =>
      requireSummary(
        createDelegationGraphView(revokedScenario).warrantSummaries.find(
          (summary) => summary.id === "warrant-comms-child-001",
        ),
        "Missing revoked comms summary.",
      ),
    [revokedScenario],
  );
  const expiredExample = useMemo(
    () =>
      requireSummary(
        createDelegationGraphView(expiredScenario).warrantSummaries.find(
          (summary) => summary.id === "warrant-calendar-child-001",
        ),
        "Missing expired calendar summary.",
      ),
    [expiredScenario],
  );
  const postRevokeAction = useMemo(
    () =>
      actionRecords.find(
        (action) => action.authorization.code === "warrant_revoked",
      ) ?? null,
    [actionRecords],
  );
  const currentApprovalState = toSendApprovalState(
    examples.commsSendApproval.status,
  );
  const currentApprovalControlState = examples.commsSendApproval.controlState;
  const commsBranchRevoked = examples.commsChildWarrant.status === "revoked";
  const approvalBoundaries = commsBranchRevoked
    ? buildRevokedApprovalBoundarySummary()
    : buildSendApprovalBoundarySummary(currentApprovalState);
  const approvalStateMatrix = buildSendApprovalStateMatrix();
  const controlStateCounts = useMemo(
    () =>
      graphView.warrantSummaries.reduce<Record<string, number>>((counts, summary) => {
        counts[summary.status] = (counts[summary.status] ?? 0) + 1;
        return counts;
      }, {}),
    [graphView.warrantSummaries],
  );
  const controlsState = useMemo(
    () =>
      rehearsal
        ? deriveRehearsalControlsState({
            rehearsal,
            scenario,
          })
        : null,
    [rehearsal, scenario],
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
    ? "current: branch revoked"
    : `current: ${formatStatusLabel(currentApprovalControlState)}`;

  return (
    <main className="page-shell">
      <section className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Delegated Authority Demo
            </p>
            <h1
              className="text-4xl font-medium tracking-tight sm:text-6xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Authorization needs <span className="italic">Warrants</span>.
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
            Maya approves one parent warrant for Planner Agent. Planner can delegate only narrower child warrants, and each branch can be denied, approved, revoked, or expired independently.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip
              label="fixture-backed demo"
              tone="bg-[var(--accent)] text-white"
              size="md"
            />
            <StatusChip
              label={authConfigured ? "auth-ready" : "auth-optional"}
              tone={
                authConfigured
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }
              size="md"
            />
          </div>
        </div>

        <div className="surface-panel p-8 backdrop-blur-sm">
          <div className="mb-6 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Root Warrant Approval
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {scenario.title}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {scenario.taskPrompt}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
            Maya authorizes Planner Agent to handle this request and delegate only narrower child warrants for calendar and email work.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">
                Target Date
              </span>
              <span className="text-right text-sm font-semibold">
                {formatDate(scenario.targetDate)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] pb-3">
              <span className="text-xs font-medium text-[var(--muted)]">
                Approved By
              </span>
              <span className="text-right text-sm font-semibold">
                {scenario.user.label}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-[var(--muted)]">
                Parent Warrant
              </span>
              <span className="max-w-[70%] break-all text-right font-mono text-[10px] font-bold text-[var(--accent)]">
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

      {controlsState?.controlsEnabled ? (
        <>
          <DemoRehearsalControls
            currentPreset={controlsState.preset}
            currentKind={controlsState.kind}
            currentLabel={controlsState.label}
            currentDescription={controlsState.description}
            updatedAt={controlsState.updatedAt}
            recoveredFromInvalidState={controlsState.recoveredFromInvalidState}
            recoveryReason={controlsState.recoveryReason}
            presets={controlsState.presets}
          />
          <DemoLivePreflightCard />
        </>
      ) : null}

      <section className="w-full">
        <DelegationGraph
          graphNodes={graphView.nodes}
          graphEdges={graphView.edges}
          warrantSummaries={graphView.warrantSummaries}
          onRevoke={handleRevokeBranch}
          eyebrow="Visual Hierarchy"
          title="Delegation Tree"
          description="A map of who received authority, what each branch can do, and which branches are denied, approved, revoked, or expired."
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
            <span>{controlStateCounts.active ?? 0} Active</span>
            <span>{controlStateCounts.approval_pending ?? 0} Approval pending</span>
            <span>{controlStateCounts.revoked ?? 0} Revoked</span>
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
            detail={
              commsBranchRevoked
                ? "Maya revoked the Comms branch. Its earlier approval remains in history, but the branch can no longer act."
                : "Planner lets Comms Agent draft for approved recipients and request one send. It still cannot send a real email without approval."
            }
            meta={`Capabilities: ${examples.commsChildWarrant.capabilities.join(", ")}`}
          />
          <ExampleCard
            eyebrow="Allowed Action"
            title={examples.calendarAction.summary}
            statusKey={examples.calendarAction.controlState}
            statusLabel={formatStatusLabel(examples.calendarAction.controlState)}
            detail={examples.calendarAction.outcomeReason}
            meta={examples.calendarAction.resource}
          />
          <ExampleCard
            eyebrow="Allowed Action"
            title={examples.commsDraftAction.summary}
            statusKey={examples.commsDraftAction.controlState}
            statusLabel={formatStatusLabel(examples.commsDraftAction.controlState)}
            detail={examples.commsDraftAction.outcomeReason}
            meta={examples.commsDraftAction.resource}
          />
          <ExampleCard
            eyebrow="Blocked Overreach"
            title={examples.commsOverreachAction.summary}
            statusKey={examples.commsOverreachAction.controlState}
            statusLabel={formatStatusLabel(examples.commsOverreachAction.controlState)}
            detail={examples.commsOverreachAction.outcomeReason}
            meta={`Policy code: ${examples.commsOverreachAction.authorization.code}`}
          />
          <ExampleCard
            eyebrow={postRevokeAction ? "Post-Revoke Failure" : "Sensitive Send"}
            title={postRevokeAction ? postRevokeAction.summary : examples.commsSendAction.summary}
            statusKey={postRevokeAction ? postRevokeAction.controlState : examples.commsSendAction.controlState}
            statusLabel={formatStatusLabel(postRevokeAction ? postRevokeAction.controlState : examples.commsSendAction.controlState)}
            detail={postRevokeAction ? postRevokeAction.outcomeReason : examples.commsSendAction.outcomeReason}
            meta={
              postRevokeAction
                ? `Policy code: ${postRevokeAction.authorization.code}`
                : examples.commsSendApproval.title
            }
          />
        </div>
      </section>

      <section className="surface-panel space-y-6 bg-white p-8 lg:p-12">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Sensitive Action Approval
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Draft authority is not send authority.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            The Comms branch can draft immediately. Sending a real email still
            requires Maya to approve the exact message before Warrant can
            release the Gmail send.
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
          <article className="surface-card bg-slate-50/60 p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Latest approval record
                </p>
                <h3 className="text-2xl font-semibold tracking-tight">
                  {examples.commsSendApproval.title}
                </h3>
              </div>
              <StatusChip
                label={formatApprovalBadge(
                  examples.commsSendApproval.controlState,
                  examples.commsSendApproval.provider,
                )}
                tone={statusTone[examples.commsSendApproval.controlState]}
                size="md"
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
                  Approved effect
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
                <StatusChip label="gmail.send" tone="bg-slate-900 text-white" size="md" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--panel-border)] bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Recipients
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    To: {examples.commsSendApproval.preview.to.join(", ")}
                  </p>
                  <p className="mt-2 break-words text-sm text-[var(--foreground)]">
                    Cc: {examples.commsSendApproval.preview.cc.join(", ")}
                  </p>
                  <p className="mt-2 break-words text-sm text-[var(--foreground)]">
                    Draft: {examples.commsSendApproval.preview.draftId ?? "none"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-slate-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Body preview
                  </p>
                  <pre
                    className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]"
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
            <StatusChip
              label={currentApprovalBadge}
              tone={commsBranchRevoked ? statusTone.revoked : statusTone[currentApprovalControlState]}
              size="md"
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

      <section className="surface-panel space-y-6 bg-white p-8 lg:p-12">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            End States
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            When authority ends
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            Revocation and expiry do different jobs. Revocation is an explicit stop. Expiry is a time limit that shuts a warrant off once its window closes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ExampleCard
            eyebrow="Revoked Branch"
            title={`${revokedExample.agentLabel} branch`}
            statusKey={revokedExample.status}
            statusLabel={formatStatusLabel(revokedExample.status)}
            detail={revokedExample.statusReason}
            meta="What changes: this branch loses authority immediately, and later actions are blocked."
          />
          <ExampleCard
            eyebrow="Expired Warrant"
            title={`${expiredExample.agentLabel} time limit`}
            statusKey={expiredExample.status}
            statusLabel={formatStatusLabel(expiredExample.status)}
            detail={expiredExample.statusReason}
            meta="What changes: new actions stop once the warrant's allowed time window ends."
          />
        </div>
      </section>

      <section
        id="timeline"
        className="surface-panel space-y-6 bg-slate-50/50 p-8 lg:p-12"
      >
        <div className="mb-8 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Audit
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Authorization Timeline
          </h2>
          <p className="text-sm text-[var(--muted)]">
            A step-by-step record of who received authority, what they tried, and why the system allowed, approved, revoked, or denied it.
          </p>
        </div>

        <div className="space-y-4">
          {timeline.map((event) => (
            <article
              key={event.id}
              className="surface-card group flex flex-col gap-6 p-6 transition-all hover:border-[var(--muted)]/20 hover:shadow-md md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusChip
                    label={formatStatusLabel(event.controlState)}
                    tone={statusTone[event.resultTone] || statusTone.active}
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
                  <span className="break-words text-right font-semibold text-[var(--foreground)]">
                    {event.actorLabel}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 py-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Proposal
                  </span>
                  <span className="break-all text-right font-semibold text-[var(--foreground)]">
                    {event.proposalId ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 py-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Runtime
                  </span>
                  <span className="break-words text-right font-semibold text-[var(--foreground)]">
                    {event.runtimeControlState
                      ? formatStatusLabel(event.runtimeControlState)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 py-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Runtime actor
                  </span>
                  <span className="break-all text-right font-semibold text-[var(--foreground)]">
                    {event.runtimeActorLabel
                      ? `${event.runtimeActorLabel} (${event.runtimeActorId})`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--panel-border)]/50 py-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Warrant
                  </span>
                  <span className="break-all text-right font-semibold text-[var(--accent)]">
                    {event.warrantId ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">
                    Parent
                  </span>
                  <span className="break-all text-right font-semibold">
                    {event.parentWarrantId ?? "root"}
                  </span>
                </div>
                {event.runtimeDetail ? (
                  <p className="rounded-lg bg-white p-2 text-[10px] leading-relaxed text-[var(--foreground)]">
                    {event.runtimeDetail}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
