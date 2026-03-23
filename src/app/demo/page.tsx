import type { Metadata } from "next";
import { getAuth0Environment } from "@/auth/env";
import { DemoSurface } from "@/components/demo/demo-surface";
import { DemoRehearsalControls } from "@/components/demo/demo-rehearsal-controls";
import {
  loadDemoRehearsalSnapshot,
  loadDemoState,
} from "@/demo-fixtures/state";

export const metadata: Metadata = {
  title: "Warrant | Wave 1 Demo",
  description:
    "Unified Wave 1 demo surface with the seeded scenario, delegation graph, and lineage-aware timeline.",
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
      controls={
        rehearsal.controlsEnabled ? (
          <DemoRehearsalControls
            currentPreset={rehearsal.preset}
            currentLabel={rehearsal.label}
            currentDescription={rehearsal.description}
            updatedAt={rehearsal.updatedAt}
            recoveredFromInvalidState={rehearsal.recoveredFromInvalidState}
            recoveryReason={rehearsal.recoveryReason}
            presets={rehearsal.presets}
          />
        ) : null
      }
    />
  );
}
