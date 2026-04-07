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
  description = "Each node is a warrant. Revoking one node immediately removes authority from that entire branch.",
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
  }, []);

  useEffect(() => {
    if (!selectedWarrantId) {
      return;
    }

    const warrantStillExists = warrantSummaries.some(
      (summary) => summary.id === selectedWarrantId,
    );

    if (!warrantStillExists) {
      setSelectedWarrantId(null);
    }
  }, [selectedWarrantId, warrantSummaries]);

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
      <section className="surface-panel flex h-[750px] flex-col overflow-hidden animate-pulse">
        <div className="h-[100px] border-b border-[var(--panel-border)] bg-slate-50/50" />
        <div className="flex-1 bg-[#fafbfc]" />
      </section>
    );
  }

  return (
    <section className="surface-panel flex flex-col overflow-hidden bg-white transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 border-b border-[var(--panel-border)] bg-slate-50/50 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{title}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
      </div>

      <div className="relative h-[560px] w-full bg-[#fafbfc] sm:h-[640px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedWarrantId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.14,
            minZoom: 0.55,
            maxZoom: 1,
          }}
          className="bg-transparent"
          minZoom={0.55}
          maxZoom={1.15}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          panOnDrag
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
        >
          <Background color="rgba(203, 213, 225, 0.4)" gap={24} size={1} />
          <Controls
            showInteractive={false}
            className="!left-4 !bottom-4 !shadow-none !border-[var(--panel-border)] sm:!left-8 sm:!bottom-8"
          />
        </ReactFlow>

        <NodeDetailPanel 
          warrant={selectedWarrant}
          onClose={() => setSelectedWarrantId(null)}
          onRevoke={handleRevoke}
        />

        <div className="surface-card absolute right-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-2 bg-white/88 px-3 py-1.5 backdrop-blur-sm sm:right-8 sm:top-auto sm:bottom-8 sm:max-w-none sm:gap-3 sm:px-4 sm:py-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Active Trace</span>
          </div>
          <div className="h-4 w-px bg-[var(--panel-border)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Graph Stable</span>
        </div>
      </div>
    </section>
  );
}
