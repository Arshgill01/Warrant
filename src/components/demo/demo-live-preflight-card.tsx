"use client";

import { useCallback, useState } from "react";
import type {
  DemoLivePreflightMode,
  DemoLivePreflightSnapshot,
} from "@/contracts";
import { StatusChip } from "@/components/foundation/status-chip";

const stateTone: Record<string, string> = {
  ready: "bg-[var(--status-allowed-bg)] text-[var(--status-allowed-text)]",
  blocked: "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-text)]",
  error: "bg-rose-50 text-rose-700",
  skipped: "bg-slate-100 text-slate-600",
};

function formatModeLabel(mode: DemoLivePreflightMode): string {
  return mode === "live" ? "live provider" : "token only";
}

function formatStateLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatCheckedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function DemoLivePreflightCard() {
  const [mode, setMode] = useState<DemoLivePreflightMode>("token-only");
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<DemoLivePreflightSnapshot | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setRequestError(null);

    try {
      const response = await fetch(`/api/demo/live-preflight?mode=${mode}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as DemoLivePreflightSnapshot;
      setSnapshot(payload);

      if (!response.ok && payload.fatalError) {
        setRequestError(payload.fatalError.message);
      }
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Failed to run live preflight.",
      );
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  return (
    <section className="surface-panel p-6">
      <div className="mb-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Live readiness preflight
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Verify Auth0 + Google path before recording.
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
          This check reports whether runtime config, Auth0 session, connected-account state, and provider paths are ready right now.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-[var(--panel-border)] bg-white p-1">
          {(["token-only", "live"] as const).map((candidate) => {
            const selected = mode === candidate;
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => setMode(candidate)}
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                  selected
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                {formatModeLabel(candidate)}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={runCheck}
          disabled={loading}
          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
            loading
              ? "cursor-wait bg-slate-200 text-slate-500"
              : "bg-[var(--accent)] text-white transition hover:bg-emerald-800"
          }`}
        >
          {loading ? "Running..." : "Run preflight"}
        </button>
      </div>

      {requestError ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {requestError}
        </p>
      ) : null}

      {snapshot ? (
        <div className="space-y-4">
          <div className="surface-card p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {snapshot.summary}
              </p>
              <StatusChip
                label={formatStateLabel(snapshot.overallState)}
                tone={stateTone[snapshot.overallState] ?? stateTone.blocked}
              />
            </div>
            <p className="text-xs text-[var(--muted)]">
              Mode: {formatModeLabel(snapshot.mode)} | Checked: {formatCheckedAt(snapshot.checkedAt)}
            </p>
            {snapshot.fatalError ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {snapshot.fatalError.code}: {snapshot.fatalError.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {snapshot.checks.map((check) => (
              <article
                key={check.id}
                className="surface-card p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {check.label}
                  </p>
                  <StatusChip
                    label={formatStateLabel(check.state)}
                    tone={stateTone[check.state] ?? stateTone.blocked}
                  />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {check.headline}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                  {check.detail}
                </p>
                {check.diagnostics?.length ? (
                  <div className="mt-3 rounded-xl border border-[var(--panel-border)] bg-white/80 px-3 py-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Diagnostics
                    </p>
                    {check.diagnostics.map((line) => (
                      <p
                        key={`${check.id}:${line}`}
                        className="break-all text-xs leading-relaxed text-[var(--muted)]"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          No preflight snapshot yet. Run preflight to inspect current live readiness.
        </p>
      )}
    </section>
  );
}
