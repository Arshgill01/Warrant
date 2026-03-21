import { MarkerType, type Edge, type XYPosition } from "@xyflow/react";
import type { AgentIdentity, DelegationNode } from "@/contracts";
import type { AgentNode } from "@/components/graph/agent-node";

const GRAPH_CENTER_X = 320;
const ROOT_Y = 84;
const LEVEL_Y_GAP = 200;
const LEVEL_X_GAP = 280;

type GraphViewModelInput = {
  agents: AgentIdentity[];
  delegationNodes: DelegationNode[];
};

export function collectDescendantWarrantIds(delegationNodes: DelegationNode[], rootWarrantId: string): string[] {
  const childrenByParent = new Map<string, string[]>();

  delegationNodes.forEach((node) => {
    if (!node.parentWarrantId) {
      return;
    }

    const currentChildren = childrenByParent.get(node.parentWarrantId) ?? [];
    currentChildren.push(node.warrantId);
    childrenByParent.set(node.parentWarrantId, currentChildren);
  });

  const descendants = new Set<string>([rootWarrantId]);
  const queue = [rootWarrantId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId) {
      continue;
    }

    const children = childrenByParent.get(currentId) ?? [];

    children.forEach((childId) => {
      if (descendants.has(childId)) {
        return;
      }

      descendants.add(childId);
      queue.push(childId);
    });
  }

  return [...descendants];
}

export function buildStableGraphPositions(delegationNodes: DelegationNode[]): Record<string, XYPosition> {
  const orderByWarrantId = new Map(delegationNodes.map((node, index) => [node.warrantId, index]));
  const sortedNodes = [...delegationNodes].sort(
    (left, right) =>
      (orderByWarrantId.get(left.warrantId) ?? Number.MAX_SAFE_INTEGER) -
      (orderByWarrantId.get(right.warrantId) ?? Number.MAX_SAFE_INTEGER),
  );
  const childrenByParent = new Map<string, DelegationNode[]>();
  const roots = sortedNodes.filter((node) => node.parentWarrantId === null);
  const levels = new Map<number, DelegationNode[]>();
  const queue = roots.map((node) => ({ depth: 0, node }));

  sortedNodes.forEach((node) => {
    if (!node.parentWarrantId) {
      return;
    }

    const currentChildren = childrenByParent.get(node.parentWarrantId) ?? [];
    currentChildren.push(node);
    childrenByParent.set(node.parentWarrantId, currentChildren);
  });

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const levelNodes = levels.get(current.depth) ?? [];
    levelNodes.push(current.node);
    levels.set(current.depth, levelNodes);

    const children = childrenByParent.get(current.node.warrantId) ?? [];

    children.forEach((child) => {
      queue.push({ depth: current.depth + 1, node: child });
    });
  }

  const positions: Record<string, XYPosition> = {};

  [...levels.entries()].forEach(([depth, nodesAtDepth]) => {
    const totalWidth = (nodesAtDepth.length - 1) * LEVEL_X_GAP;
    const levelStartX = GRAPH_CENTER_X - totalWidth / 2;

    nodesAtDepth.forEach((node, index) => {
      positions[node.warrantId] = {
        x: levelStartX + index * LEVEL_X_GAP,
        y: ROOT_Y + depth * LEVEL_Y_GAP,
      };
    });
  });

  return positions;
}

export function buildDelegationGraphNodes({ agents, delegationNodes }: GraphViewModelInput): AgentNode[] {
  const positions = buildStableGraphPositions(delegationNodes);
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));

  return delegationNodes.map((node) => {
    const agent = agentsById.get(node.agentId);

    return {
      id: node.warrantId,
      type: "agent",
      data: {
        label: agent?.label ?? "Unknown Agent",
        role: agent?.role ?? "planner",
        status: node.status,
        capabilities: node.capabilitySummary,
        isRevoked: node.status === "revoked",
      },
      position: positions[node.warrantId] ?? { x: GRAPH_CENTER_X, y: ROOT_Y },
    };
  });
}

export function buildDelegationGraphEdges(delegationNodes: DelegationNode[]): Edge[] {
  return delegationNodes
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
}
