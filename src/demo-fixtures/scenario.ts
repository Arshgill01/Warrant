import type { DemoScenario } from "@/contracts";
import { runMainScenarioPlannerFlow } from "@/agents";

const cloneScenario = <Value>(value: Value): Value => structuredClone(value);

export function createDefaultDemoScenario(): DemoScenario {
  return cloneScenario(runMainScenarioPlannerFlow().scenario);
}
