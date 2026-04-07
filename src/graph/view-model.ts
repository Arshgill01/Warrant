import { MarkerType, type Edge, type XYPosition } from "@xyflow/react";
import type {
  GraphEdgeDTO,
  GraphNodeDTO,
} from "@/contracts";
import type { AgentNode } from "@/components/graph/agent-node";

const GRAPH_CENTER_X = 360;
const ROOT_Y = 72;
const LEVEL_Y_GAP = 188;
const LEVEL_X_GAP = 236;

const ROLE_LAYOUT_ORDER: Record<GraphNodeDTO["role"], number> = {
  planner: 0,
  calendar: 1,
  comms: 2,
};

type GraphViewModelInput = {
  graphNodes: GraphNodeDTO[];
};

export function collectDescendantNodeIds(
  graphNodes: GraphNodeDTO[],
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
  graphNodes: GraphNodeDTO[],
): Record<string, XYPosition> {
  const compareNodesForLayout = (left: GraphNodeDTO, right: GraphNodeDTO): number => {
    const leftParent = left.parentId ?? "";
    const rightParent = right.parentId ?? "";
    const parentComparison = leftParent.localeCompare(rightParent);

    if (parentComparison !== 0) {
      return parentComparison;
    }

    const roleComparison = ROLE_LAYOUT_ORDER[left.role] - ROLE_LAYOUT_ORDER[right.role];

    if (roleComparison !== 0) {
      return roleComparison;
    }

    const labelComparison = left.label.localeCompare(right.label, "en", {
      sensitivity: "base",
    });

    if (labelComparison !== 0) {
      return labelComparison;
    }

    return left.id.localeCompare(right.id);
  };

  const sortedNodes = [...graphNodes].sort(compareNodesForLayout);
  const childrenByParent = new Map<string, GraphNodeDTO[]>();
  const roots = sortedNodes.filter((node) => node.parentId === null);
  const levels = new Map<number, GraphNodeDTO[]>();
  const queue = roots.map((node) => ({ depth: 0, node }));

  sortedNodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }

    const currentChildren = childrenByParent.get(node.parentId) ?? [];
    currentChildren.push(node);
    childrenByParent.set(node.parentId, currentChildren);
  });

  childrenByParent.forEach((children, parentId) => {
    childrenByParent.set(parentId, [...children].sort(compareNodesForLayout));
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
        statusReason: node.statusReason,
        runtimeActorId: node.runtimeActorId,
        runtimeStatus: node.runtimeStatus,
        capabilities: node.capabilityBadges,
        purpose: node.purpose,
        canDelegate: node.canDelegate,
        expiresAt: node.expiresAt,
        isRevoked:
          node.status === "revoked" || node.status === "blocked_revoked",
      },
      position: positions[node.id] ?? { x: GRAPH_CENTER_X, y: ROOT_Y },
    }));
}

export function buildDelegationGraphEdges(
  graphEdges: GraphEdgeDTO[],
): Edge[] {
  const resolveEdgeStyle = (
    status: GraphEdgeDTO["status"],
  ): {
    color: string;
    opacity: number;
    strokeDasharray?: string;
  } => {
    switch (status) {
      case "revoked":
      case "blocked_revoked":
        return {
          color: "#be123c",
          opacity: 0.62,
          strokeDasharray: "6 5",
        };
      case "expired":
      case "blocked_expired":
        return {
          color: "#64748b",
          opacity: 0.68,
          strokeDasharray: "5 4",
        };
      case "approval_required":
      case "approval_pending":
        return {
          color: "#d97706",
          opacity: 0.9,
          strokeDasharray: "4 3",
        };
      case "approval_denied":
      case "denied_policy":
        return {
          color: "#e11d48",
          opacity: 0.82,
          strokeDasharray: "3 3",
        };
      default:
        return {
          color: "var(--accent)",
          opacity: 0.92,
        };
    }
  };

  return graphEdges.map((edge) => {
    const edgeStyle = resolveEdgeStyle(edge.status);

    return {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      animated: false,
      style: {
        stroke: edgeStyle.color,
        strokeWidth: 2.25,
        opacity: edgeStyle.opacity,
        strokeDasharray: edgeStyle.strokeDasharray,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeStyle.color,
      },
    };
  });
}
