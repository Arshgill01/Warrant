import type { DelegationNode, DemoScenario, LedgerEvent } from "@/contracts";
import {
  createDefaultDemoScenario,
  createDelegationNodes,
  createTimelineEvents,
  getScenarioExamples,
  type DemoScenarioExampleSet,
} from "@/demo-fixtures/scenario";

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

export function loadDelegationNodes(): DelegationNode[] {
  return createDelegationNodes(loadDemoState());
}

export function loadTimelineEvents(): LedgerEvent[] {
  return createTimelineEvents(loadDemoState());
}

export function loadScenarioExamples(): DemoScenarioExampleSet {
  return getScenarioExamples(loadDemoState());
}
