import type { Metadata } from "next";
import { getAuth0Environment } from "@/auth/env";
import { DemoSurface } from "@/components/demo/demo-surface";
import { loadDemoState } from "@/demo-fixtures";

export const metadata: Metadata = {
  title: "Warrant | Wave 1 Demo",
  description:
    "Unified Wave 1 demo surface with the seeded scenario, delegation graph, and lineage-aware timeline.",
};

export default function DemoPage() {
  const authEnv = getAuth0Environment();
  const scenario = loadDemoState();

  return (
    <DemoSurface
      initialScenario={scenario}
      authConfigured={authEnv.isConfigured}
    />
  );
}
