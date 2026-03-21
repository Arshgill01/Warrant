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
    <div className="relative h-[600px] w-full overflow-hidden rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[0_20px_80px_rgba(16,18,23,0.08)] backdrop-blur">
      <div className="absolute left-8 top-8 z-10">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</p>
        <h2 className="text-3xl font-serif">{title}</h2>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent"
        // Disable zooming for a stable "diagram" feel in the demo
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={true}
      >
        <Background color="#101217" gap={20} size={1} />
        <Controls showInteractive={false} className="!left-8 !bottom-8" />
      </ReactFlow>

      <NodeDetailPanel 
        warrant={selectedWarrant}
        agent={selectedAgent}
        onClose={() => setSelectedWarrantId(null)}
        onRevoke={handleRevoke}
      />

      <div className="absolute right-8 bottom-8 flex flex-col items-end gap-2 text-right">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stable Viewport</span>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="max-w-[200px] text-[11px] leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
