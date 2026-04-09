import type { Metadata } from "next";
import { getAuth0Environment } from "@/auth/env";
import { DemoSurface } from "@/components/demo/demo-surface";
import {
  loadDemoRehearsalSnapshot,
} from "@/demo-fixtures/state";
import {
  resolveDemoRuntimeMode,
  resolveDemoScenarioForRuntime,
} from "@/demo-fixtures/live-runtime";

export const metadata: Metadata = {
  title: "Warrant | Delegated Authority Demo",
  description:
    "Warrant demo surface with live-runtime and seeded-fallback lanes, delegation graph, approval boundary, and lineage-aware timeline.",
};

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface DemoPageProps {
  searchParams?: Promise<PageSearchParams>;
}

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const runtimeMode = resolveDemoRuntimeMode(resolvedSearchParams.runtimeMode);
  const authEnv = getAuth0Environment();
  const rehearsal = loadDemoRehearsalSnapshot();
  const scenario = await resolveDemoScenarioForRuntime({
    mode: runtimeMode,
    preset: rehearsal.preset,
  });

  return (
    <DemoSurface
      initialScenario={scenario}
      authConfigured={authEnv.isConfigured}
      rehearsal={rehearsal}
      requestedRuntimeMode={runtimeMode}
    />
  );
}
