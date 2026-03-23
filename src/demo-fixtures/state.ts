import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
  ApprovalStateDisplayRecord,
  DelegationGraphDTO,
  DisplayScenarioExampleSet,
  DemoScenario,
  TimelineEventDisplayRecord,
} from "@/contracts";
import {
  createApprovalStateDisplayRecords,
  createDelegationGraphView,
  createTimelineEventDisplayRecords,
  getDisplayScenarioExamples,
} from "@/demo-fixtures/display";
import {
  createMainDemoScenario,
  createDefaultDemoScenario,
} from "@/demo-fixtures/scenario";

const DEMO_STATE_VERSION = 1;
const DEFAULT_PRESET = "main";

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

function createScenarioFromPreset(preset: DemoScenarioPreset): DemoScenario {
  switch (preset) {
    case "main":
      return createMainDemoScenario();
    case "comms-revoked":
      return createDefaultDemoScenario();
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
