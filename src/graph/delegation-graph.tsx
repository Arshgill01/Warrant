"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNodeComponent, type AgentNode } from "@/components/graph/agent-node";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import type {
  GraphEdgeDTO,
  GraphNodeDTO,
  WarrantDisplaySummary,
} from "@/contracts";
import {
  buildDelegationGraphEdges,
  buildDelegationGraphNodes,
} from "@/graph/view-model";

const nodeTypes = {
  agent: AgentNodeComponent,
};

type DelegationGraphProps = {
  graphNodes: GraphNodeDTO[];
  graphEdges: GraphEdgeDTO[];
  warrantSummaries: WarrantDisplaySummary[];
  onRevoke?: (warrantId: string) => void;
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function DelegationGraph({
  graphNodes,
  graphEdges,
  warrantSummaries,
  onRevoke,
  eyebrow = "Authority Graph",
  title = "Delegation Tree",
  description = "Nodes represent warrants. Revoking a node invalidates its entire branch.",
}: DelegationGraphProps) {
  const nodes = useMemo(
    () => buildDelegationGraphNodes({ graphNodes }),
    [graphNodes],
  );
  const edges = useMemo(() => buildDelegationGraphEdges(graphEdges), [graphEdges]);
  const [selectedWarrantId, setSelectedWarrantId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setSelectedWarrantId(null);
  }, [edges, nodes, warrantSummaries]);

  const onNodeClick = useCallback<NodeMouseHandler<AgentNode>>((_, node) => {
    setSelectedWarrantId(node.id);
  }, []);

  const selectedWarrant = useMemo(
    () => warrantSummaries.find((summary) => summary.id === selectedWarrantId) || null,
    [selectedWarrantId, warrantSummaries],
  );

  const handleRevoke = useCallback((warrantId: string) => {
    onRevoke?.(warrantId);
  }, [onRevoke]);

  if (!isMounted) {
    return (
      <section className="flex flex-col overflow-hidden rounded-[2.5rem] border border-[var(--panel-border)] bg-white shadow-sm h-[750px] animate-pulse">
        <div className="h-[100px] border-b border-[var(--panel-border)] bg-slate-50/50" />
        <div className="flex-1 bg-[#fafbfc]" />
      </section>
    );
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-[2.5rem] border border-[var(--panel-border)] bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 border-b border-[var(--panel-border)] bg-slate-50/50 p-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
      </div>

      <div className="relative h-[650px] w-full bg-[#fafbfc]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnScroll={false}
          panOnDrag={true}
        >
          <Background color="rgba(203, 213, 225, 0.4)" gap={24} size={1} />
          <Controls showInteractive={false} className="!left-8 !bottom-8 !shadow-none !border-[var(--panel-border)]" />
        </ReactFlow>

        <NodeDetailPanel 
          warrant={selectedWarrant}
          onClose={() => setSelectedWarrantId(null)}
          onRevoke={handleRevoke}
        />

        <div className="absolute bottom-8 right-8 flex items-center gap-3 rounded-full border border-[var(--panel-border)] bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Active Trace</span>
          </div>
          <div className="h-4 w-px bg-[var(--panel-border)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Graph Stable</span>
        </div>
      </div>
    </section>
  );
}
