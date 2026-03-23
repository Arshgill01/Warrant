import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
  ApprovalStateDisplayRecord,
  DelegationGraphDTO,
  DisplayScenarioExampleSet,
  DemoScenario,
  LedgerEvent,
  RevocationRecord,
  TimelineEventDisplayRecord,
} from "@/contracts";
import {
  createApprovalStateDisplayRecords,
  createDelegationGraphView,
  createTimelineEventDisplayRecords,
  getDisplayScenarioExamples,
} from "@/demo-fixtures/display";
import { createDefaultDemoScenario } from "@/demo-fixtures/scenario";
import { revokeWarrantBranch } from "@/warrants";

const DEMO_STATE_VERSION = 1;
const DEFAULT_PRESET = "main";
const COMMS_WARRANT_ID = "warrant-comms-child-001";
const COMMS_AGENT_ID = "agent-comms-001";
const COMMS_REVOCATION_ID = "revocation-comms-branch-001";
const COMMS_REVOCATION_EVENT_ID = "event-comms-branch-revoked-001";
const COMMS_REVOCATION_AT = "2026-04-17T09:16:00.000Z";
const COMMS_REVOCATION_REASON =
  "Maya revokes the Comms branch after the risky send attempt to prove descendants lose authority immediately.";

const cloneScenario = <Value>(value: Value): Value => structuredClone(value);

const presetCatalog = {
  main: {
    label: "Main scenario",
    description:
      "Restores the canonical rehearsal state: draft succeeds, overreach is blocked, and the bounded send pauses for approval.",
  },
  "comms-revoked": {
    label: "Comms revoked",
    description:
      "Restores the same scenario after Maya revokes the Comms branch so the graph and audit trail prove branch-level authority loss.",
  },
} as const;

export type DemoScenarioPreset = keyof typeof presetCatalog;

type DemoStoredState = {
  version: number;
  kind: "preset" | "custom";
  preset: DemoScenarioPreset;
  scenario: DemoScenario | null;
  updatedAt: string;
};

export type DemoRehearsalSnapshot = {
  kind: DemoStoredState["kind"];
  preset: DemoScenarioPreset;
  label: string;
  description: string;
  updatedAt: string;
  controlsEnabled: boolean;
  recoveredFromInvalidState: boolean;
  recoveryReason: string | null;
  presets: Array<{
    id: DemoScenarioPreset;
    label: string;
    description: string;
  }>;
};

type ResolvedDemoState = {
  storedState: DemoStoredState;
  scenario: DemoScenario;
  recoveredFromInvalidState: boolean;
  recoveryReason: string | null;
};

function getDemoStateFilePath(): string {
  return process.env.WARRANT_DEMO_STATE_FILE ?? join(tmpdir(), "warrant-demo-state.json");
}

function createStoredState(input: {
  kind: DemoStoredState["kind"];
  preset: DemoScenarioPreset;
  scenario: DemoScenario | null;
}): DemoStoredState {
  return {
    version: DEMO_STATE_VERSION,
    kind: input.kind,
    preset: input.preset,
    scenario: input.scenario ? cloneScenario(input.scenario) : null,
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultStoredState(): DemoStoredState {
  return createStoredState({
    kind: "preset",
    preset: DEFAULT_PRESET,
    scenario: null,
  });
}

function isDemoScenarioPreset(value: unknown): value is DemoScenarioPreset {
  return typeof value === "string" && value in presetCatalog;
}

function writeStoredState(nextState: DemoStoredState): void {
  const filePath = getDemoStateFilePath();
  const tempPath = `${filePath}.${process.pid}.tmp`;

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(tempPath, JSON.stringify(nextState, null, 2), "utf8");
  renameSync(tempPath, filePath);
}

function readStoredState(): {
  status: "ok" | "missing" | "invalid";
  value: unknown;
} {
  try {
    return {
      status: "ok",
      value: JSON.parse(readFileSync(getDemoStateFilePath(), "utf8")),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {
        status: "missing",
        value: null,
      };
    }

    return {
      status: "invalid",
      value: null,
    };
  }
}

function isUsableDemoScenario(value: unknown): value is DemoScenario {
  if (!value || typeof value !== "object") {
    return false;
  }

  try {
    const scenario = cloneScenario(value as DemoScenario);
    createDelegationGraphView(scenario);
    createTimelineEventDisplayRecords(scenario);
    getDisplayScenarioExamples(scenario);
    return true;
  } catch {
    return false;
  }
}

function isStoredState(value: unknown): value is DemoStoredState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DemoStoredState>;

  if (candidate.version !== DEMO_STATE_VERSION) {
    return false;
  }

  if (candidate.kind !== "preset" && candidate.kind !== "custom") {
    return false;
  }

  if (!isDemoScenarioPreset(candidate.preset)) {
    return false;
  }

  if (typeof candidate.updatedAt !== "string") {
    return false;
  }

  if (candidate.kind === "preset") {
    return candidate.scenario === null;
  }

  return isUsableDemoScenario(candidate.scenario);
}

function createCommsRevokedScenario(): DemoScenario {
  const scenario = createDefaultDemoScenario();
  const result = revokeWarrantBranch({
    warrants: scenario.warrants,
    warrantId: COMMS_WARRANT_ID,
    revokedAt: COMMS_REVOCATION_AT,
    revokedBy: scenario.user.id,
    reason: COMMS_REVOCATION_REASON,
  });
  const commsWarrant = result.warrants.find((warrant) => warrant.id === COMMS_WARRANT_ID);

  if (!commsWarrant) {
    throw new Error("Expected comms warrant in revoked preset.");
  }

  const revocation: RevocationRecord = {
    id: COMMS_REVOCATION_ID,
    warrantId: COMMS_WARRANT_ID,
    parentWarrantId: commsWarrant.parentId,
    revokedByKind: "user",
    revokedById: scenario.user.id,
    revokedAt: COMMS_REVOCATION_AT,
    reason: COMMS_REVOCATION_REASON,
    cascadedWarrantIds: result.revokedWarrantIds.filter((id) => id !== COMMS_WARRANT_ID),
  };
  const revocationEvent: LedgerEvent = {
    id: COMMS_REVOCATION_EVENT_ID,
    at: COMMS_REVOCATION_AT,
    kind: "warrant.revoked",
    actorKind: "user",
    actorId: scenario.user.id,
    warrantId: COMMS_WARRANT_ID,
    parentWarrantId: commsWarrant.parentId,
    actionId: null,
    approvalId: scenario.examples.commsSendApprovalId,
    revocationId: revocation.id,
    title: "Comms branch revoked",
    description:
      "Maya revokes the Comms branch after the risky send attempt, so the branch loses authority immediately while Calendar remains active.",
  };

  return {
    ...scenario,
    agents: scenario.agents.map((agent) =>
      agent.id === COMMS_AGENT_ID
        ? {
            ...agent,
            status: "revoked",
          }
        : agent,
    ),
    warrants: result.warrants,
    revocations: [revocation],
    timeline: [...scenario.timeline, revocationEvent].sort((left, right) => left.at.localeCompare(right.at)),
  };
}

function createScenarioFromPreset(preset: DemoScenarioPreset): DemoScenario {
  switch (preset) {
    case "main":
      return createDefaultDemoScenario();
    case "comms-revoked":
      return createCommsRevokedScenario();
  }
}

function repairStoredState(reason: string): ResolvedDemoState {
  const nextState = createDefaultStoredState();
  writeStoredState(nextState);

  return {
    storedState: nextState,
    scenario: createScenarioFromPreset(nextState.preset),
    recoveredFromInvalidState: true,
    recoveryReason: reason,
  };
}

function resolveDemoState(): ResolvedDemoState {
  const storedState = readStoredState();

  if (storedState.status === "missing") {
    const nextState = createDefaultStoredState();
    writeStoredState(nextState);

    return {
      storedState: nextState,
      scenario: createScenarioFromPreset(nextState.preset),
      recoveredFromInvalidState: false,
      recoveryReason: null,
    };
  }

  if (storedState.status === "invalid") {
    return repairStoredState(
      "Stored demo state was half-written or unreadable, so Warrant restored the canonical main scenario.",
    );
  }

  if (!isStoredState(storedState.value)) {
    return repairStoredState(
      "Stored demo state was stale or invalid, so Warrant restored the canonical main scenario.",
    );
  }

  if (storedState.value.kind === "custom") {
    if (!storedState.value.scenario || !isUsableDemoScenario(storedState.value.scenario)) {
      return repairStoredState(
        "The saved custom demo state was incomplete, so Warrant restored the canonical main scenario.",
      );
    }

    return {
      storedState: storedState.value,
      scenario: cloneScenario(storedState.value.scenario),
      recoveredFromInvalidState: false,
      recoveryReason: null,
    };
  }

  return {
    storedState: storedState.value,
    scenario: createScenarioFromPreset(storedState.value.preset),
    recoveredFromInvalidState: false,
    recoveryReason: null,
  };
}

export function isDemoToolsEnabled(): boolean {
  return process.env.WARRANT_ENABLE_DEMO_TOOLS === "true" || process.env.NODE_ENV === "development";
}

export function loadDemoRehearsalSnapshot(): DemoRehearsalSnapshot {
  const resolved = resolveDemoState();
  const activePreset = presetCatalog[resolved.storedState.preset];

  return {
    kind: resolved.storedState.kind,
    preset: resolved.storedState.preset,
    label: resolved.storedState.kind === "custom" ? "Custom state" : activePreset.label,
    description:
      resolved.storedState.kind === "custom"
        ? "A local helper replaced the canonical preset for this process."
        : activePreset.description,
    updatedAt: resolved.storedState.updatedAt,
    controlsEnabled: isDemoToolsEnabled(),
    recoveredFromInvalidState: resolved.recoveredFromInvalidState,
    recoveryReason: resolved.recoveryReason,
    presets: Object.entries(presetCatalog).map(([id, preset]) => ({
      id: id as DemoScenarioPreset,
      label: preset.label,
      description: preset.description,
    })),
  };
}

export function loadDemoState(): DemoScenario {
  return cloneScenario(resolveDemoState().scenario);
}

export function replaceDemoState(nextState: DemoScenario): DemoScenario {
  if (!isUsableDemoScenario(nextState)) {
    throw new Error("replaceDemoState expected a complete demo scenario.");
  }

  writeStoredState(
    createStoredState({
      kind: "custom",
      preset: DEFAULT_PRESET,
      scenario: nextState,
    }),
  );

  return loadDemoState();
}

export function restoreDemoStatePreset(preset: DemoScenarioPreset): DemoScenario {
  writeStoredState(
    createStoredState({
      kind: "preset",
      preset,
      scenario: null,
    }),
  );

  return loadDemoState();
}

export function resetDemoState(): DemoScenario {
  return restoreDemoStatePreset(DEFAULT_PRESET);
}

export function loadDelegationGraphView(): DelegationGraphDTO {
  return createDelegationGraphView(loadDemoState());
}

export function loadTimelineEvents(): TimelineEventDisplayRecord[] {
  return createTimelineEventDisplayRecords(loadDemoState());
}

export function loadApprovalStates(): ApprovalStateDisplayRecord[] {
  return createApprovalStateDisplayRecords(loadDemoState());
}

export function loadScenarioExamples(): DisplayScenarioExampleSet {
  return getDisplayScenarioExamples(loadDemoState());
}
