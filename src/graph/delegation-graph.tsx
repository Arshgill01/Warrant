"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNodeComponent, type AgentNode } from "@/components/graph/agent-node";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import type { AgentIdentity, DelegationNode, WarrantContract } from "@/contracts";
import {
  buildDelegationGraphEdges,
  buildDelegationGraphNodes,
  collectDescendantWarrantIds,
} from "@/graph/view-model";

const nodeTypes = {
  agent: AgentNodeComponent,
};

type DelegationGraphProps = {
  warrants: WarrantContract[];
  agents: AgentIdentity[];
  delegationNodes: DelegationNode[];
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function DelegationGraph({
  warrants: initialWarrants,
  agents,
  delegationNodes,
  eyebrow = "Authority Graph",
  title = "Delegation Tree",
  description = "Nodes represent warrants. Revoking a node invalidates its entire branch.",
}: DelegationGraphProps) {
  const baseNodes = useMemo(
    () => buildDelegationGraphNodes({ agents, delegationNodes }),
    [agents, delegationNodes],
  );
  const baseEdges = useMemo(() => buildDelegationGraphEdges(delegationNodes), [delegationNodes]);
  const [warrants, setWarrants] = useState(initialWarrants);
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);
  const [selectedWarrantId, setSelectedWarrantId] = useState<string | null>(null);

  useEffect(() => {
    setWarrants(initialWarrants);
    setNodes(baseNodes);
    setEdges(baseEdges);
    setSelectedWarrantId(null);
  }, [baseEdges, baseNodes, initialWarrants, setEdges, setNodes]);

  const onNodeClick = useCallback<NodeMouseHandler<AgentNode>>((_, node) => {
    setSelectedWarrantId(node.id);
  }, []);

  const selectedWarrant = useMemo(
    () => warrants.find((w) => w.id === selectedWarrantId) || null,
    [selectedWarrantId, warrants]
  );

  const selectedAgent = useMemo(
    () => (selectedWarrant ? agents.find((agent) => agent.id === selectedWarrant.agentId) ?? null : null),
    [agents, selectedWarrant]
  );

  const handleRevoke = useCallback((warrantId: string) => {
    const toRevoke = new Set(collectDescendantWarrantIds(delegationNodes, warrantId));

    setWarrants((currentWarrants) =>
      currentWarrants.map((warrant) =>
        toRevoke.has(warrant.id)
          ? {
              ...warrant,
              status: "revoked",
            }
          : warrant
      )
    );

    setNodes((nds) =>
      nds.map((node) => {
        if (toRevoke.has(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              status: "revoked",
              isRevoked: true,
            },
          };
        }
        return node;
      })
    );

    setEdges((eds) =>
      eds.map((edge) => {
        if (toRevoke.has(edge.source) || toRevoke.has(edge.target)) {
          return {
            ...edge,
            animated: false,
            style: { ...edge.style, stroke: "#cbd5e1", opacity: 0.5 },
          };
        }
        return edge;
      })
    );
  }, [delegationNodes, setEdges, setNodes]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[0_20px_80px_rgba(16,18,23,0.08)] backdrop-blur">
        <div className="absolute left-6 top-6 z-10 max-w-[16rem] rounded-2xl border border-[var(--panel-border)] bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(16,18,23,0.05)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</p>
          <h2 className="mt-1 text-3xl font-serif">{title}</h2>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.24 }}
          className="bg-transparent"
          // Disable zooming for a stable "diagram" feel in the demo
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnScroll={false}
          panOnDrag={true}
        >
          <Background color="#101217" gap={20} size={1} />
          <Controls showInteractive={false} className="!left-6 !bottom-6" />
        </ReactFlow>

        <div className="absolute bottom-6 right-6 z-10 max-w-[14rem] rounded-2xl border border-[var(--panel-border)] bg-[#101217]/90 px-4 py-3 text-right shadow-[0_10px_30px_rgba(16,18,23,0.12)]">
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Stable Viewport</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
            {description}
          </p>
        </div>
      </div>

      <div className="xl:sticky xl:top-6 xl:self-start">
        <NodeDetailPanel 
          warrant={selectedWarrant}
          agent={selectedAgent}
          onClose={() => setSelectedWarrantId(null)}
          onRevoke={handleRevoke}
        />
      </div>
    </div>
  );
}
