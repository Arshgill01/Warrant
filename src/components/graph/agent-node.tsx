import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { 
  ShieldCheck, 
  User, 
  Brain, 
  Calendar, 
  Mail, 
  FileText, 
  AlertCircle, 
  Ban,
  Clock
} from "lucide-react";
import type { AgentRole, AgentStatus } from "@/contracts/agent";

export type AgentNodeData = {
  label: string;
  role: AgentRole;
  status: AgentStatus | "pending" | "denied" | "expired";
  capabilities: string[];
  isRevoked?: boolean;
};

export type AgentNode = Node<AgentNodeData>;

const roleIcons: Record<AgentRole, React.ReactNode> = {
  planner: <Brain className="size-5" />,
  calendar: <Calendar className="size-5" />,
  comms: <Mail className="size-5" />,
  docs: <FileText className="size-5" />,
};

const statusIcons: Record<NonNullable<AgentNodeData["status"]>, React.ReactNode> = {
  active: <ShieldCheck className="size-3.5" />,
  idle: <Clock className="size-3.5" />,
  blocked: <Ban className="size-3.5" />,
  revoked: <AlertCircle className="size-3.5" />,
  pending: <Clock className="size-3.5" />,
  denied: <Ban className="size-3.5" />,
  expired: <Clock className="size-3.5" />,
};

const statusColors: Record<NonNullable<AgentNodeData["status"]>, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  idle: "bg-slate-100 text-slate-500 border-slate-200",
  blocked: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  revoked: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  pending: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  denied: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  expired: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export const AgentNodeComponent = memo(({ data, selected }: NodeProps<AgentNode>) => {
  const isRoot = data.label === "Root User";
  const isRevoked = data.status === "revoked" || data.isRevoked;

  return (
    <div className={`
      relative min-w-[240px] rounded-2xl border bg-white p-4 shadow-sm transition-all
      ${selected ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : "border-[var(--panel-border)]"}
      ${isRevoked ? "opacity-60 grayscale-[0.5]" : ""}
    `}>
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-2 !border-white !bg-[var(--accent)]"
        />
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`
            flex size-10 items-center justify-center rounded-xl border
            ${isRoot ? "bg-slate-900 text-white border-slate-900" : "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--panel-border)]"}
          `}>
            {isRoot ? <User className="size-6" /> : roleIcons[data.role]}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{data.label}</h3>
            <div className={`mt-1 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[data.status]}`}>
              {statusIcons[data.status]}
              {data.status}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Capabilities</p>
        <div className="flex flex-wrap gap-1.5">
          {data.capabilities.map((cap) => (
            <span key={cap} className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-100">
              {cap}
            </span>
          ))}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-2 !border-white !bg-[var(--accent)]"
      />
    </div>
  );
});

AgentNodeComponent.displayName = "AgentNode";
