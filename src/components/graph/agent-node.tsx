import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { User, Brain, Calendar, Mail, ChevronRight } from "lucide-react";
import type { DisplayStatus } from "@/contracts";
import type { AgentRole } from "@/contracts/agent";

export type AgentNodeData = {
  label: string;
  role: AgentRole;
  status: DisplayStatus;
  statusReason: string;
  runtimeActorId: string;
  runtimeStatus: DisplayStatus | null;
  capabilities: string[];
  purpose: string;
  canDelegate: boolean;
  expiresAt: string;
  isRevoked?: boolean;
};

export type AgentNode = Node<AgentNodeData>;

const roleIcons: Record<AgentRole, React.ReactNode> = {
  planner: <Brain className="size-4" />,
  calendar: <Calendar className="size-4" />,
  comms: <Mail className="size-4" />,
};

const statusColors: Record<AgentNodeData["status"], string> = {
  active: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)] border-[var(--status-allowed-text)]/20",
  denied_policy: "bg-rose-50 text-rose-700 border-rose-200",
  approval_required: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] border-[var(--status-pending-text)]/20",
  approval_pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] border-[var(--status-pending-text)]/20",
  approval_approved: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)] border-[var(--status-allowed-text)]/20",
  approval_denied: "bg-rose-50 text-rose-700 border-rose-200",
  blocked_revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)] border-[var(--status-revoked-text)]/20",
  blocked_expired: "bg-slate-100 text-slate-500 border-slate-200",
  provider_unavailable: "bg-amber-50 text-amber-700 border-amber-200",
  revoked: "bg-[var(--status-revoked-bg)] text-[var(--status-revoked-text)] border-[var(--status-revoked-text)]/20",
  expired: "bg-slate-100 text-slate-400 border-slate-200",
};

function formatDisplayStatus(value: DisplayStatus): string {
  return value.replaceAll("_", " ");
}

export const AgentNodeComponent = memo(({ data, selected }: NodeProps<AgentNode>) => {
  const isRoot = data.label === "Root User";
  const isRevoked =
    data.status === "revoked" ||
    data.status === "blocked_revoked" ||
    data.isRevoked;

  return (
    <div className={`
      relative w-[220px] overflow-hidden rounded-2xl border bg-white p-0 shadow-sm transition-all duration-200 sm:w-[248px]
      ${selected ? "border-[var(--accent)] ring-4 ring-[var(--accent-soft)] shadow-md" : "border-[var(--panel-border)]"}
      ${isRevoked ? "opacity-75 grayscale-[0.4]" : "hover:shadow-md hover:border-[var(--muted)]/30"}
    `}>
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[var(--accent)] !opacity-100"
        />
      )}
      
      {/* Node Header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--panel-border)] bg-slate-50/30 p-3.5 sm:gap-3 sm:p-4">
        <div className={`
          flex size-9 shrink-0 items-center justify-center rounded-xl border sm:size-10
          ${isRoot ? "bg-slate-900 text-white border-slate-800 shadow-sm" : "bg-white text-[var(--accent)] border-[var(--panel-border)] shadow-sm"}
        `}>
          {isRoot ? <User className="size-4 sm:size-5" /> : roleIcons[data.role]}
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="truncate text-[15px] font-bold tracking-tight text-[var(--foreground)] sm:text-base">{data.label}</h3>
          <p className="truncate font-mono text-[8.5px] font-semibold uppercase tracking-wide text-[var(--muted)] sm:text-[9px]">
            runtime: {data.runtimeActorId}
          </p>
          <div className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider sm:text-[9px] ${statusColors[data.status]}`}>
            {formatDisplayStatus(data.status)}
          </div>
          {data.runtimeStatus ? (
            <p className="mt-1 truncate font-mono text-[8px] font-semibold uppercase tracking-wide text-slate-500">
              runtime: {formatDisplayStatus(data.runtimeStatus)}
            </p>
          ) : null}
        </div>
        {selected && <ChevronRight className="size-3.5 text-[var(--accent)] sm:size-4" />}
      </div>

      {/* Node Body */}
      <div className="space-y-2.5 p-3.5 sm:space-y-3 sm:p-4">
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] sm:text-[10px]">Can do</p>
          <div className="flex flex-wrap gap-1">
            {data.capabilities.length > 0 ? (
              data.capabilities.map((cap) => (
                <span key={cap} className="inline-flex max-w-full items-center truncate rounded-md border border-slate-200/60 bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-600 sm:text-[10px]">
                  {cap}
                </span>
              ))
            ) : (
              <span className="text-[9px] italic text-slate-400 sm:text-[10px]">No allowed actions</span>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[var(--accent)] !opacity-100"
      />
      
      {/* Revoked Overlay */}
      {isRevoked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 pointer-events-none">
          <div className="rotate-[-12deg] rounded-md border-2 border-rose-500/30 bg-rose-50/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 shadow-sm">
            Revoked
          </div>
        </div>
      )}
    </div>
  );
});

AgentNodeComponent.displayName = "AgentNode";
