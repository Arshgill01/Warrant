import React from "react";
import { 
  X, 
  Shield, 
  Target, 
  Clock, 
  History, 
  ChevronRight,
  Trash2,
  AlertTriangle,
  Ban
} from "lucide-react";
import type { WarrantContract } from "@/contracts/warrant";
import type { AgentIdentity } from "@/contracts/agent";

type NodeDetailPanelProps = {
  warrant: WarrantContract | null;
  agent: AgentIdentity | null;
  onClose: () => void;
  onRevoke: (warrantId: string) => void;
};

export function NodeDetailPanel({ warrant, agent, onClose, onRevoke }: NodeDetailPanelProps) {
  if (!warrant || !agent) return null;

  const isRevoked = warrant.status === "revoked";
  const isRoot = agent.label === "Root User";

  return (
    <div className="absolute right-6 top-6 bottom-6 w-96 overflow-y-auto rounded-3xl border border-[var(--panel-border)] bg-white/95 p-6 shadow-[0_20px_80px_rgba(16,18,23,0.12)] backdrop-blur-xl transition-all">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <Shield className="size-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Warrant Details</span>
        </div>
        <button 
          onClick={onClose}
          className="rounded-full p-2 hover:bg-slate-100 transition-colors"
        >
          <X className="size-5 text-slate-400" />
        </button>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-serif text-slate-900">{agent.label}</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {warrant.purpose}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {isRevoked ? <Ban className="size-3.5 text-rose-600" /> : <Shield className="size-3.5 text-emerald-600" />}
            {warrant.status}
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Target className="size-4 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Capabilities</h3>
            </div>
            <div className="space-y-2">
              {warrant.capabilities.map((cap) => (
                <div key={cap} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="text-sm font-medium text-slate-700">{cap}</span>
                  <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600 uppercase">
                    Authorized
                  </div>
                </div>
              ))}
            </div>
          </section>

          {Object.keys(warrant.resourceConstraints).length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Constraints</h3>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                {Object.entries(warrant.resourceConstraints).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-mono text-slate-700">{Array.isArray(value) ? value.join(", ") : value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="size-4 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Validity</h3>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Expires At</span>
                <span className="font-medium text-slate-700">{new Date(warrant.expiresAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Max Children</span>
                <span className="font-medium text-slate-700">{warrant.maxChildren}</span>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <History className="size-4 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Lineage</h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs">
                {warrant.parentId || "ROOT"}
              </div>
              <ChevronRight className="size-4" />
              <div className="rounded-md bg-blue-50 px-2 py-1 font-mono text-xs text-blue-600 border border-blue-100">
                {warrant.id}
              </div>
            </div>
          </section>
        </div>

        {!isRoot && (
          <div className="pt-6">
            <button 
              disabled={isRevoked}
              onClick={() => onRevoke(warrant.id)}
              className={`
                flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-sm font-bold uppercase tracking-widest transition-all
                ${isRevoked 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-[0.98] border border-rose-100"}
              `}
            >
              {isRevoked ? <Ban className="size-4" /> : <Trash2 className="size-4" />}
              {isRevoked ? "Warrant Revoked" : "Revoke Branch"}
            </button>
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-800 border border-amber-100">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              <p>
                Revoking this warrant will immediately invalidate this agent and all its sub-delegations. This cannot be undone.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
