"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNodeComponent, type AgentNode } from "@/components/graph/agent-node";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import { mockDelegationNodes, mockWarrants, mockAgents } from "@/demo-fixtures/graph-data";
import type { AgentStatus } from "@/contracts/agent";

const nodeTypes = {
  agent: AgentNodeComponent,
};

const initialNodes: AgentNode[] = mockDelegationNodes.map((node, index) => {
  const agent = mockAgents.find((a) => a.id === node.agentId);
  
  return {
    id: node.warrantId,
    type: "agent",
    data: {
      label: agent?.label || "Unknown Agent",
      role: agent?.role || "planner",
      status: node.status,
      capabilities: node.capabilitySummary,
      isRevoked: node.status === "revoked",
    },
    // Simple manual positioning for tree layout
    position: { 
      x: node.parentWarrantId ? (index % 2 === 0 ? 100 : 500) : 300, 
      y: node.parentWarrantId ? (index > 1 ? 400 : 200) : 0 
    },
  };
});

const initialEdges: Edge[] = mockDelegationNodes
  .filter((node) => node.parentWarrantId)
  .map((node) => ({
    id: `e-${node.parentWarrantId}-${node.warrantId}`,
    source: node.parentWarrantId!,
    target: node.warrantId,
    animated: true,
    style: { stroke: "var(--accent)", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "var(--accent)",
    },
  }));

export function DelegationGraph() {
  const [warrants, setWarrants] = useState(mockWarrants);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedWarrantId, setSelectedWarrantId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedWarrantId(node.id);
  }, []);

  const selectedWarrant = useMemo(
    () => warrants.find((w) => w.id === selectedWarrantId) || null,
    [selectedWarrantId, warrants]
  );

  const selectedAgent = useMemo(
    () => (selectedWarrant ? mockAgents.find((a) => a.id === selectedWarrant.agentId) || null : null),
    [selectedWarrant]
  );

  const handleRevoke = useCallback((warrantId: string) => {
    // Find all descendants to revoke them too
    const toRevoke = new Set<string>([warrantId]);
    const findDescendants = (parentId: string) => {
      mockDelegationNodes
        .filter((n) => n.parentWarrantId === parentId)
        .forEach((n) => {
          toRevoke.add(n.warrantId);
          findDescendants(n.warrantId);
        });
    };
    findDescendants(warrantId);

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
              status: "revoked" as AgentStatus,
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
  }, [setNodes, setEdges]);

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[0_20px_80px_rgba(16,18,23,0.08)] backdrop-blur">
      <div className="absolute left-8 top-8 z-10">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">Authority Graph</p>
        <h2 className="text-3xl font-serif">Delegation Tree</h2>
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
          Nodes represent warrants. Revoking a node invalidates its entire branch.
        </p>
      </div>
    </div>
  );
}
