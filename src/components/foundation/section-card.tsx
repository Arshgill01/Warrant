type SectionCardProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <article className="surface-card p-5 sm:p-6">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="mb-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      <div className="space-y-2.5 text-sm leading-6 text-[var(--muted)]">{children}</div>
    </article>
  );
}
