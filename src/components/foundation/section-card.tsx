type SectionCardProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--panel-border)] bg-white/50 p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)] uppercase">
          {eyebrow}
        </span>
      </div>
      <p className="text-xs text-[var(--muted)] leading-normal">{children}</p>
    </article>
  );
}
