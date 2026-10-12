/**
 * A progress bar as a stick of candy: a thick tube with diagonal stripes in
 * the given color and a glossy highlight. Stripes drift slowly (unless the
 * viewer prefers reduced motion).
 */
export function CandyBar({
  value,
  max,
  color = "var(--action)",
  size = "md",
  label,
  track,
  className = "",
}: {
  value: number;
  max: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  /** Background of the empty part. Defaults to the surface color. */
  track?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const h = size === "sm" ? "h-2.5" : size === "lg" ? "h-5" : "h-3.5";
  return (
    <span
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={`relative block overflow-hidden rounded-full border-2 border-ink bg-surface-2 ${h} ${className}`}
      style={track ? { background: track } : undefined}
    >
      <span
        className="candy-stripes absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
      {/* glossy highlight along the top */}
      <span className="pointer-events-none absolute inset-x-1 top-[18%] h-[22%] rounded-full bg-white/25" />
    </span>
  );
}
