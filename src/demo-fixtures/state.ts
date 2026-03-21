import type {
  DelegationGraphDTO,
  DisplayScenarioExampleSet,
  DemoScenario,
  TimelineEventDisplayRecord,
} from "@/contracts";
import { createDefaultDemoScenario } from "@/demo-fixtures/scenario";
import {
  createDelegationGraphView,
  createTimelineEventDisplayRecords,
  getDisplayScenarioExamples,
} from "@/demo-fixtures/display";

const cloneScenario = <Value>(value: Value): Value => structuredClone(value);

let currentDemoState = createDefaultDemoScenario();

export function loadDemoState(): DemoScenario {
  return cloneScenario(currentDemoState);
}

export function replaceDemoState(nextState: DemoScenario): DemoScenario {
  currentDemoState = cloneScenario(nextState);
  return loadDemoState();
}

export function resetDemoState(): DemoScenario {
  currentDemoState = createDefaultDemoScenario();
  return loadDemoState();
}

export function loadDelegationGraphView(): DelegationGraphDTO {
  return createDelegationGraphView(loadDemoState());
}

export function loadTimelineEvents(): TimelineEventDisplayRecord[] {
  return createTimelineEventDisplayRecords(loadDemoState());
}

export function loadScenarioExamples(): DisplayScenarioExampleSet {
  return getDisplayScenarioExamples(loadDemoState());
}
