import type { WorktreeBoundary } from "@/contracts";
import { SectionCard } from "@/components/foundation/section-card";
import { WorktreeGrid } from "@/components/foundation/worktree-grid";

type FoundationShellProps = {
  boundaries: WorktreeBoundary[];
};

const statusItems = [
  {
    label: "Scaffold",
    value: "Ready",
    detail: "Next.js, TypeScript, Tailwind, lint, test, and typecheck are wired.",
  },
  {
    label: "Product logic",
    value: "Deferred",
    detail: "No Auth0, warrant engine, agent, or graph implementation exists yet.",
  },
  {
    label: "Parallel work",
    value: "Planned",
    detail: "Boundaries are split so feature worktrees can land with low overlap.",
  },
] as const;

export function FoundationShell({ boundaries }: FoundationShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] p-8 shadow-[0_20px_80px_rgba(16,18,23,0.08)] backdrop-blur">
        <div className="mb-6 inline-flex rounded-full border border-[var(--panel-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
          Foundation Scaffold
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
              Warrant
            </p>
            <h1 className="max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
              OAuth was designed for apps. AI agents need warrants.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              This repo is intentionally at the shared-foundation stage. The shell is ready for parallel work on
              auth, delegation, approvals, graph UI, audit, and demo fixtures without prematurely shipping product
              logic.
            </p>
          </div>
          <div className="grid gap-3">
            {statusItems.map((item) => (
              <SectionCard key={item.label} title={item.label} eyebrow={item.value}>
                {item.detail}
              </SectionCard>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Current scope" eyebrow="Skeleton only">
          The scaffold includes product-boundary directories, shared contracts, placeholder fixtures, and a landing
          page that explains the intended ownership split. It does not yet wire Auth0, Token Vault, Google, LangGraph,
          persistence, or a graph library.
        </SectionCard>
        <SectionCard title="Shared contracts" eyebrow="Cross-worktree">
          `src/contracts` contains the initial shared types for agents, warrants, actions, approvals, graph state, and
          worktree ownership. The goal is coordination, not abstraction.
        </SectionCard>
      </section>

      <WorktreeGrid boundaries={boundaries} />
    </main>
  );
}
