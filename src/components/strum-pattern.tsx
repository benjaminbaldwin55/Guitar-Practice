import type { StrumPattern } from "@/content/strums";

const COUNTS = ["1", "&", "2", "&", "3", "&", "4", "&"];

/**
 * Eight slots, one per eighth note. Down strums land on the numbers, up strums
 * on the "&". Empty slots: the hand still moves, it just misses the strings.
 */
export function StrumPatternView({ pattern }: { pattern: StrumPattern }) {
  return (
    <div>
      <ol className="grid grid-cols-8 gap-1.5" aria-label={`Strum pattern: ${pattern.name}`}>
        {pattern.slots.map((s, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={`flex aspect-square w-full items-center justify-center rounded-(--r) border-(length:--bw) border-ink text-2xl font-black ${
                s === "D" ? "bg-ink text-bg" : s === "U" ? "bg-surface" : "border-dashed opacity-40"
              }`}
              aria-label={s === "D" ? "down" : s === "U" ? "up" : "miss"}
            >
              {s === "D" ? "↓" : s === "U" ? "↑" : ""}
            </span>
            <span className={`text-sm ${i % 2 === 0 ? "font-bold" : "text-ink-dim"}`}>{COUNTS[i]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
