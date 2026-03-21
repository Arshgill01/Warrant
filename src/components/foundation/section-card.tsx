type SectionCardProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <article className="rounded-[1.6rem] border border-[var(--panel-border)] bg-white/70 p-5 shadow-[0_10px_30px_rgba(16,18,23,0.04)]">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-6 text-[var(--muted)]">{children}</div>
    </article>
  );
}
