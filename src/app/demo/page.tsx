import type { Metadata } from "next";
import { getAuth0Environment } from "@/auth/env";
import { DemoSurface } from "@/components/demo/demo-surface";
import {
  loadDemoRehearsalSnapshot,
  loadDemoState,
} from "@/demo-fixtures/state";

export const metadata: Metadata = {
  title: "Warrant | Delegated Authority Demo",
  description:
    "Seeded Warrant demo surface with the delegation graph, approval boundary, and lineage-aware timeline.",
};

export const dynamic = "force-dynamic";

export default function DemoPage() {
  const authEnv = getAuth0Environment();
  const rehearsal = loadDemoRehearsalSnapshot();
  const scenario = loadDemoState();

  return (
    <DemoSurface
      initialScenario={scenario}
      authConfigured={authEnv.isConfigured}
      rehearsal={rehearsal}
    />
  );
}
