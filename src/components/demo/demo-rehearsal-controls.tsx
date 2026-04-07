type DemoRehearsalControlsProps = {
  currentPreset: string;
  currentKind: "preset" | "custom";
  currentLabel: string;
  currentDescription: string;
  updatedAt: string;
  recoveredFromInvalidState: boolean;
  recoveryReason: string | null;
  presets: Array<{
    id: string;
    label: string;
    description: string;
  }>;
};

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function DemoRehearsalControls({
  currentPreset,
  currentKind,
  currentLabel,
  currentDescription,
  updatedAt,
  recoveredFromInvalidState,
  recoveryReason,
  presets,
}: DemoRehearsalControlsProps) {
  return (
    <section className="surface-panel p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Demo-only rehearsal tools</p>
          <h2 className="text-2xl font-semibold tracking-tight">Restore a known-good state before each take.</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            Reset the demo to the canonical proof sequence or jump to the revocation replay state. These controls are
            gated and meant only for rehearsal or recording.
          </p>
        </div>
        <div className="surface-card px-4 py-3 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Current state</p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{currentLabel}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{formatUpdatedAt(updatedAt)}</p>
        </div>
      </div>

      <div className="surface-card mb-5 p-4">
        <p className="text-sm font-medium text-[var(--foreground)]">{currentDescription}</p>
        {recoveredFromInvalidState && recoveryReason ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {recoveryReason}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {presets.map((preset) => {
          const isActive = currentKind === "preset" && preset.id === currentPreset;
          const isSourcePreset = currentKind === "custom" && preset.id === currentPreset;

          return (
            <article
              key={preset.id}
              className={`surface-card p-4 ${
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]/40"
                  : isSourcePreset
                    ? "border-amber-200 bg-amber-50/40"
                    : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{preset.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {isActive
                      ? "Active preset"
                      : isSourcePreset
                        ? "Source preset"
                        : "Available preset"}
                  </p>
                </div>
                <form action="/api/demo/state" method="post">
                  <input type="hidden" name="preset" value={preset.id} />
                  <input type="hidden" name="returnTo" value="/demo" />
                  <button
                    type="submit"
                    disabled={isActive}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
                      isActive
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "bg-[var(--accent)] text-white transition hover:bg-emerald-800"
                    }`}
                  >
                    {isActive ? "Active" : "Restore"}
                  </button>
                </form>
              </div>
              <p className="text-sm leading-relaxed text-[var(--muted)]">{preset.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
