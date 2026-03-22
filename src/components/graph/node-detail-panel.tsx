import {
  X,
  Shield,
  Target,
  Clock, 
  ChevronRight,
  Trash2,
  AlertTriangle,
  Ban,
  FileSearch,
  Activity,
  UserCheck
} from "lucide-react";
import type { WarrantDisplaySummary } from "@/contracts";

type NodeDetailPanelProps = {
  warrant: WarrantDisplaySummary | null;
  onClose: () => void;
  onRevoke: (warrantId: string) => void;
};

export function NodeDetailPanel({ warrant, onClose, onRevoke }: NodeDetailPanelProps) {
  if (!warrant) return null;

  const isRevoked = warrant.status === "revoked";
  const isRoot = warrant.agentLabel === "Root User";
  const statusTone: Record<WarrantDisplaySummary["status"], string> = {
    active: "bg-emerald-50 text-emerald-600 border-emerald-200",
    idle: "bg-slate-50 text-slate-500 border-slate-200",
    blocked: "bg-rose-50 text-rose-600 border-rose-200",
    denied: "bg-rose-100 text-rose-700 border-rose-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    revoked: "bg-rose-50 text-rose-600 border-rose-200",
    expired: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-20 w-[420px] flex flex-col border-l border-[var(--panel-border)] bg-white shadow-2xl transition-all duration-300 ease-in-out animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] bg-slate-50/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[var(--panel-border)] text-[var(--accent)] shadow-sm">
            <FileSearch className="size-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Report Status</p>
            <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Warrant Analysis</h2>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="rounded-xl border border-[var(--panel-border)] p-2 bg-white hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
        >
          <X className="size-5 text-[var(--muted)]" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        {/* Identity Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest
              ${statusTone[warrant.status]}`}
            >
              {isRevoked ? <Ban className="size-3.5" /> : <Shield className="size-3.5" />}
              {warrant.status}
            </div>
            <span className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase tracking-tighter">
              ID: {warrant.id}
            </span>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-3xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: "var(--font-serif)" }}>
              {warrant.agentLabel}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {warrant.purpose}
            </p>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-[var(--accent)]" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Authorized Capabilities</h4>
          </div>
          <div className="grid gap-2">
            {warrant.capabilities.map((cap) => (
              <div key={cap} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-hover hover:border-[var(--accent-soft)]">
                <span className="text-sm font-semibold text-[var(--foreground)]">{cap}</span>
                <div className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                  Verified
                </div>
              </div>
            ))}
            {warrant.capabilities.length === 0 && (
              <p className="text-xs italic text-[var(--muted)]">No capabilities assigned to this warrant.</p>
            )}
          </div>
        </section>

        {/* Constraints Section */}
        {warrant.constraints.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[var(--accent)]" />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Resource Constraints</h4>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-50">
                  {warrant.constraints.map((constraint) => (
                    <tr key={constraint.label} className="group">
                      <td className="px-4 py-3 font-medium text-[var(--muted)] capitalize bg-slate-50/30 w-1/3">
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

        {/* Temporal Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[var(--accent)]" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Temporal Integrity</h4>
          </div>
          <div className="grid gap-4 rounded-2xl border border-slate-100 p-5 bg-slate-50/30">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-[var(--muted)]">Expiration Policy</span>
              <span className="text-xs font-bold text-[var(--foreground)]">{new Date(warrant.expiresAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-[var(--muted)]">Delegation Depth</span>
              <span className="text-xs font-bold text-[var(--foreground)]">{warrant.maxChildren} child warrants</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-[var(--muted)]">Redelegation</span>
              <span className={`text-xs font-bold ${warrant.canDelegate ? "text-emerald-600" : "text-rose-600"}`}>
                {warrant.canDelegate ? "Enabled" : "Restricted"}
              </span>
            </div>
          </div>
        </section>

        {/* Lineage Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-[var(--accent)]" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Warrant Lineage</h4>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-200">
            <div className="flex-1 rounded-lg bg-slate-100 p-2 text-center">
              <span className="block text-[8px] font-black uppercase text-slate-400 tracking-tighter">Parent</span>
              <span className="font-mono text-[10px] font-bold">{warrant.parentId || "ROOT"}</span>
            </div>
            <ChevronRight className="size-4 text-slate-300" />
            <div className="flex-1 rounded-lg bg-[var(--accent-soft)] p-2 text-center border border-[var(--accent)]/10">
              <span className="block text-[8px] font-black uppercase text-[var(--accent)] tracking-tighter">Current</span>
              <span className="font-mono text-[10px] font-bold text-[var(--accent)]">{warrant.id}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer / Actions */}
      {!isRoot && (
        <div className="border-t border-[var(--panel-border)] bg-slate-50/80 p-6 space-y-4">
          {isRevoked ? (
            <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              <AlertTriangle className="size-5 shrink-0" />
              <p>{warrant.revocationReason ?? "This warrant branch has been decommissioned and cannot be reactivated."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-amber-50/50 p-4 text-[10px] leading-relaxed text-amber-800 border border-amber-100/50">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <p>
                  <strong>Revocation Protocol:</strong> Triggering a revocation will immediately cascade through all sub-delegations, invalidating their tokens and access paths.
                </p>
              </div>
              <button 
                onClick={() => onRevoke(warrant.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-700 active:scale-[0.98]"
              >
                <Trash2 className="size-4" />
                Execute Revocation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
