type StatusChipProps = {
  label: string;
  tone: string;
  size?: "sm" | "md";
};

const chipSizeClass: Record<NonNullable<StatusChipProps["size"]>, string> = {
  sm: "px-2.5 py-0.5 text-[10px] tracking-[0.16em]",
  md: "px-3 py-1 text-xs tracking-[0.18em]",
};

export function StatusChip({ label, tone, size = "sm" }: StatusChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase ${chipSizeClass[size]} ${tone}`}
    >
      {label}
    </span>
  );
}
