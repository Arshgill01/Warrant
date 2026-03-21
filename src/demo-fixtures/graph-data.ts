import type { DelegationNode } from "@/contracts/graph";
import type { WarrantContract } from "@/contracts/warrant";
import type { AgentIdentity } from "@/contracts/agent";

export const mockAgents: AgentIdentity[] = [
  { id: "user-0", role: "planner", label: "Root User" },
  { id: "planner-1", role: "planner", label: "Planner Agent" },
  { id: "calendar-2", role: "calendar", label: "Calendar Agent" },
  { id: "comms-3", role: "comms", label: "Comms Agent" },
];

export const mockWarrants: WarrantContract[] = [
  {
    id: "w-root",
    parentId: null,
    agentId: "user-0",
    purpose: "Root authority granted by human.",
    capabilities: ["calendar.read", "gmail.draft", "gmail.send"],
    resourceConstraints: {},
    canDelegate: true,
    maxChildren: 10,
    expiresAt: "2026-12-31T23:59:59Z",
    status: "active",
  },
  {
    id: "w-planner",
    parentId: "w-root",
    agentId: "planner-1",
    purpose: "Orchestrate investor update and follow-ups.",
    capabilities: ["calendar.read", "gmail.draft", "gmail.send"],
    resourceConstraints: {},
    canDelegate: true,
    maxChildren: 5,
    expiresAt: "2026-06-30T12:00:00Z",
    status: "active",
  },
  {
    id: "w-calendar",
    parentId: "w-planner",
    agentId: "calendar-2",
    purpose: "Read availability for scheduling.",
    capabilities: ["calendar.read"],
    resourceConstraints: { calendarWindow: "7d" },
    canDelegate: false,
    maxChildren: 0,
    expiresAt: "2026-06-30T12:00:00Z",
    status: "active",
  },
  {
    id: "w-comms",
    parentId: "w-planner",
    agentId: "comms-3",
    purpose: "Draft follow-up emails.",
    capabilities: ["gmail.draft", "gmail.send"],
    resourceConstraints: { allowedDomains: ["gmail.com"] },
    canDelegate: false,
    maxChildren: 0,
    expiresAt: "2026-06-30T12:00:00Z",
    status: "active",
  },
];

export const mockDelegationNodes: DelegationNode[] = [
  {
    warrantId: "w-root",
    agentId: "user-0",
    parentWarrantId: null,
    status: "active",
    capabilitySummary: ["Full Root Access"],
  },
  {
    warrantId: "w-planner",
    agentId: "planner-1",
    parentWarrantId: "w-root",
    status: "active",
    capabilitySummary: ["Calendar", "Email Draft", "Email Send"],
  },
  {
    warrantId: "w-calendar",
    agentId: "calendar-2",
    parentWarrantId: "w-planner",
    status: "active",
    capabilitySummary: ["Calendar Read"],
  },
  {
    warrantId: "w-comms",
    agentId: "comms-3",
    parentWarrantId: "w-planner",
    status: "active",
    capabilitySummary: ["Email Draft", "Email Send"],
  },
];
