import { MarkerType, type Edge, type XYPosition } from "@xyflow/react";
import type {
  DelegationGraphEdgeRecord,
  DelegationGraphNodeRecord,
} from "@/contracts";
import type { AgentNode } from "@/components/graph/agent-node";

const GRAPH_CENTER_X = 320;
const ROOT_Y = 84;
const LEVEL_Y_GAP = 200;
const LEVEL_X_GAP = 280;

type GraphViewModelInput = {
  graphNodes: DelegationGraphNodeRecord[];
};

export function collectDescendantNodeIds(
  graphNodes: DelegationGraphNodeRecord[],
  rootNodeId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();

  graphNodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }

    const currentChildren = childrenByParent.get(node.parentId) ?? [];
    currentChildren.push(node.id);
    childrenByParent.set(node.parentId, currentChildren);
  });

  const descendants = new Set<string>([rootNodeId]);
  const queue = [rootNodeId];

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

export function buildStableGraphPositions(
  graphNodes: DelegationGraphNodeRecord[],
): Record<string, XYPosition> {
  const orderByNodeId = new Map(graphNodes.map((node, index) => [node.id, index]));
  const sortedNodes = [...graphNodes].sort(
    (left, right) =>
      (orderByNodeId.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (orderByNodeId.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
  const childrenByParent = new Map<string, DelegationGraphNodeRecord[]>();
  const roots = sortedNodes.filter((node) => node.parentId === null);
  const levels = new Map<number, DelegationGraphNodeRecord[]>();
  const queue = roots.map((node) => ({ depth: 0, node }));

  sortedNodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }

    const currentChildren = childrenByParent.get(node.parentId) ?? [];
    currentChildren.push(node);
    childrenByParent.set(node.parentId, currentChildren);
  });

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const levelNodes = levels.get(current.depth) ?? [];
    levelNodes.push(current.node);
    levels.set(current.depth, levelNodes);

    const children = childrenByParent.get(current.node.id) ?? [];

    children.forEach((child) => {
      queue.push({ depth: current.depth + 1, node: child });
    });
  }

  const positions: Record<string, XYPosition> = {};

  [...levels.entries()].forEach(([depth, nodesAtDepth]) => {
    const totalWidth = (nodesAtDepth.length - 1) * LEVEL_X_GAP;
    const levelStartX = GRAPH_CENTER_X - totalWidth / 2;

    nodesAtDepth.forEach((node, index) => {
      positions[node.id] = {
        x: levelStartX + index * LEVEL_X_GAP,
        y: ROOT_Y + depth * LEVEL_Y_GAP,
      };
    });
  });

  return positions;
}

export function buildDelegationGraphNodes({
  graphNodes,
}: GraphViewModelInput): AgentNode[] {
  const positions = buildStableGraphPositions(graphNodes);

  return graphNodes.map((node) => ({
    id: node.id,
    type: "agent",
    data: {
      label: node.label,
      role: node.role,
      status: node.status,
      capabilities: node.capabilityBadges,
      purpose: node.purpose,
      canDelegate: node.canDelegate,
      expiresAt: node.expiresAt,
      isRevoked: node.status === "revoked",
    },
    position: positions[node.id] ?? { x: GRAPH_CENTER_X, y: ROOT_Y },
  }));
}

export function buildDelegationGraphEdges(
  graphEdges: DelegationGraphEdgeRecord[],
): Edge[] {
  return graphEdges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    animated: edge.status !== "revoked",
    style: {
      stroke: edge.status === "revoked" ? "#cbd5e1" : "var(--accent)",
      strokeWidth: 2,
      opacity: edge.status === "revoked" ? 0.5 : 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.status === "revoked" ? "#cbd5e1" : "var(--accent)",
    },
  }));
}
