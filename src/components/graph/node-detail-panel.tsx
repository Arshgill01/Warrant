import {
  Activity,
  AlertTriangle,
  Ban,
  ChevronRight,
  Clock,
  FileSearch,
  Shield,
  Target,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import type { WarrantDisplaySummary } from "@/contracts";

type NodeDetailPanelProps = {
  warrant: WarrantDisplaySummary | null;
  onClose: () => void;
  onRevoke: (warrantId: string) => void;
};

const statusTone: Record<WarrantDisplaySummary["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  denied_policy: "bg-rose-50 text-rose-700 border-rose-200",
  approval_required: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] border-amber-200",
  approval_pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] border-amber-200",
  approval_approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approval_denied: "bg-rose-50 text-rose-700 border-rose-200",
  blocked_revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)] border-rose-200",
  revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)] border-rose-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
};

function formatDisplayStatus(value: WarrantDisplaySummary["status"]): string {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatStatusSource(value: WarrantDisplaySummary["statusSource"]): string {
  return value.replaceAll("-", " ");
}

export function NodeDetailPanel({
  warrant,
  onClose,
  onRevoke,
}: NodeDetailPanelProps) {
  if (!warrant) {
    return null;
  }

  const isRevoked =
    warrant.status === "revoked" || warrant.status === "blocked_revoked";
  const isAttentionState =
    warrant.status === "denied_policy" ||
    warrant.status === "approval_required" ||
    warrant.status === "approval_pending" ||
    warrant.status === "approval_denied" ||
    warrant.status === "blocked_revoked";
  const isRoot = warrant.agentLabel === "Root User";
  const canRevokeBranch = warrant.agentRole === "comms" && !isRoot;
  const latestPolicyDenial = warrant.latestPolicyDenial;
  const statusIcon = isRevoked ? (
    <Ban className="size-3.5" />
  ) : isAttentionState ? (
    <AlertTriangle className="size-3.5" />
  ) : (
    <Shield className="size-3.5" />
  );

  return (
    <div className="absolute bottom-0 right-0 top-0 z-20 flex w-[420px] flex-col border-l border-[var(--panel-border)] bg-white shadow-2xl transition-all duration-300 ease-in-out animate-in slide-in-from-right">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] bg-slate-50/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-white text-[var(--accent)] shadow-sm">
            <FileSearch className="size-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Authority Detail
            </p>
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
              Warrant detail
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-[var(--panel-border)] bg-white p-2 shadow-sm transition-colors hover:bg-slate-50 active:scale-95"
        >
          <X className="size-5 text-[var(--muted)]" />
        </button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-10 overflow-y-auto p-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone[warrant.status]}`}
            >
              {statusIcon}
              {formatDisplayStatus(warrant.status)}
            </div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-tighter text-[var(--muted)]">
              ID: {warrant.id}
            </span>
          </div>

          <div className="space-y-2">
            <h3
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {warrant.agentLabel}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {warrant.purpose}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                Why this status is shown
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]">
                {formatStatusSource(warrant.statusSource)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--foreground)]">
              {warrant.statusReason}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-[var(--accent)]" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
              This branch can do
            </h4>
          </div>
          <div className="grid gap-2">
            {warrant.capabilities.map((capability) => (
              <div
                key={capability}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {capability}
                </span>
                <div className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                  Allowed
                </div>
              </div>
            ))}
            {warrant.capabilities.length === 0 && (
              <p className="text-xs italic text-[var(--muted)]">
                This warrant cannot perform any actions.
              </p>
            )}
          </div>
        </section>

        {warrant.latestAction && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[var(--accent)]" />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                Latest action
              </h4>
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {warrant.latestAction.summary}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {warrant.latestAction.kind} at{" "}
                    {formatDateTime(warrant.latestAction.requestedAt)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {warrant.latestAction.controlState.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--foreground)]">
                {warrant.latestAction.outcomeReason}
              </p>
              <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-[var(--muted)]">Resource</span>
                  <span className="text-right font-semibold text-[var(--foreground)]">
                    {warrant.latestAction.resource}
                  </span>
                </div>
                {warrant.latestAction.providerState && (
                  <>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-[var(--muted)]">Provider state</span>
                      <span className="font-semibold uppercase tracking-wide text-[var(--foreground)]">
                        {warrant.latestAction.providerState.replace("-", " ")}
                      </span>
                    </div>
                    {warrant.latestAction.providerHeadline && (
                      <p className="text-xs leading-relaxed text-[var(--muted)]">
                        {warrant.latestAction.providerHeadline}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {warrant.latestApproval && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--accent)]" />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                Latest approval
              </h4>
            </div>
            <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {warrant.latestApproval.title}
                </p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {warrant.latestApproval.status}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--foreground)]">
                {warrant.latestApproval.reason}
              </p>
              <div className="grid gap-2 text-xs text-[var(--muted)]">
                <p>
                  Requested: {formatDateTime(warrant.latestApproval.requestedAt)}
                </p>
                <p>
                  Expires: {formatDateTime(warrant.latestApproval.expiresAt)}
                </p>
                {warrant.latestApproval.decidedAt ? (
                  <p>
                    Decided: {formatDateTime(warrant.latestApproval.decidedAt)}
                  </p>
                ) : null}
                <p>
                  Recipients:{" "}
                  {warrant.latestApproval.affectedRecipients.join(", ")}
                </p>
                <p>Blast radius: {warrant.latestApproval.blastRadius}</p>
                {isRevoked ? (
                  <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700">
                    This approval remains visible for audit, but the branch was
                    revoked and can no longer execute.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {warrant.constraints.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[var(--accent)]" />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                Limits
              </h4>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-50">
                  {warrant.constraints.map((constraint) => (
                    <tr key={constraint.label}>
                      <td className="w-1/3 bg-slate-50/30 px-4 py-3 font-medium capitalize text-[var(--muted)]">
                        {constraint.label}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-[var(--foreground)]">
                        {constraint.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[var(--accent)]" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
              Time limits
            </h4>
          </div>
          <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/30 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted)]">
                Issued
              </span>
              <span className="text-xs font-bold text-[var(--foreground)]">
                {formatDateTime(warrant.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted)]">
                Expires
              </span>
              <span className="text-xs font-bold text-[var(--foreground)]">
                {formatDateTime(warrant.expiresAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted)]">
                Delegation depth
              </span>
              <span className="text-xs font-bold text-[var(--foreground)]">
                {warrant.maxChildren} child warrants
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted)]">
                Redelegation
              </span>
              <span
                className={`text-xs font-bold ${
                  warrant.canDelegate ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {warrant.canDelegate ? "Enabled" : "Restricted"}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-[var(--accent)]" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
              Authority chain
            </h4>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 p-4">
            <div className="flex-1 rounded-lg bg-slate-100 p-2 text-center">
              <span className="block text-[8px] font-black uppercase tracking-tighter text-slate-400">
                Parent
              </span>
              <span className="font-mono text-[10px] font-bold">
                {warrant.parentLabel ?? warrant.parentId ?? "ROOT"}
              </span>
            </div>
            <ChevronRight className="size-4 text-slate-300" />
            <div className="flex-1 rounded-lg border border-[var(--accent)]/10 bg-[var(--accent-soft)] p-2 text-center">
              <span className="block text-[8px] font-black uppercase tracking-tighter text-[var(--accent)]">
                Current
              </span>
              <span className="font-mono text-[10px] font-bold text-[var(--accent)]">
                {warrant.id}
              </span>
            </div>
          </div>
        </section>

        {latestPolicyDenial ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--status-blocked-text)]" />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Latest denied action</h4>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {latestPolicyDenial.summary}
                </p>
                <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  {latestPolicyDenial.authorization.code}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-amber-900">
                {latestPolicyDenial.outcomeReason}
              </p>
              <div className="grid gap-3 rounded-xl border border-amber-100 bg-white/80 p-4 text-[11px] font-medium text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase tracking-wider text-slate-500">Attempted action</span>
                  <span className="font-mono font-bold text-slate-900">{latestPolicyDenial.kind}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase tracking-wider text-slate-500">Blocked by warrant</span>
                  <span className="font-mono font-bold text-slate-900">{latestPolicyDenial.authorization.blockedByWarrantId ?? warrant.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase tracking-wider text-slate-500">Resource</span>
                  <span className="text-right font-semibold text-slate-900">{latestPolicyDenial.resource}</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {canRevokeBranch ? (
        <div className="space-y-4 border-t border-[var(--panel-border)] bg-slate-50/80 p-6">
          {isRevoked ? (
            <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              <AlertTriangle className="size-5 shrink-0" />
              <p>
                {warrant.revocationReason ??
                  "This branch was revoked. This agent and its descendants can no longer act."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-amber-100/50 bg-amber-50/50 p-4 text-[10px] leading-relaxed text-amber-800">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <p>
                  <strong>Revocation effect:</strong> Revoking this branch immediately removes authority from this warrant and every descendant below it.
                </p>
              </div>
              <button
                onClick={() => onRevoke(warrant.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-700 active:scale-[0.98]"
              >
                <Trash2 className="size-4" />
                Revoke Comms Branch
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
