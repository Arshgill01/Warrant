import type { WorktreeBoundary } from "@/contracts";

type WorktreeGridProps = {
  boundaries: WorktreeBoundary[];
};

const statusTone: Record<WorktreeBoundary["status"], string> = {
  placeholder: "bg-slate-900 text-white",
  shared: "bg-[var(--accent)] text-white",
  reserved: "bg-amber-700 text-white",
};

export function WorktreeGrid({ boundaries }: WorktreeGridProps) {
  return (
    <section className="rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[0_20px_80px_rgba(16,18,23,0.08)] backdrop-blur">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">Worktree boundaries</p>
          <h2 className="text-3xl font-serif">Directory ownership map</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
          Each directory is a landing zone for a future slice of product work. Shared changes should stay concentrated
          in `src/contracts`, `src/app`, and `src/components`.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {boundaries.map((boundary) => (
          <article
            key={boundary.key}
            className="rounded-[1.6rem] border border-[var(--panel-border)] bg-white/75 p-5 shadow-[0_10px_30px_rgba(16,18,23,0.04)]"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{boundary.path}</p>
                <h3 className="text-2xl font-semibold">{boundary.label}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone[boundary.status]}`}>
                {boundary.status}
              </span>
            </div>
            <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{boundary.purpose}</p>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Suggested worktree</dt>
                <dd className="text-[var(--muted)]">{boundary.futureWorktree}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--foreground)]">Notes</dt>
                <dd className="text-[var(--muted)]">{boundary.notes}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
