import type { AchievementState } from "@/lib/achievements";

const TILTS = [-4, 3, -2, 4, -3, 2];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * An achievement as a gig-poster sticker. Earned: filled in the owner's
 * color and slapped on at a tilt. Locked: a dashed outline.
 */
export function Sticker({
  state,
  color,
  on,
  size = 84,
  pop = false,
}: {
  state: AchievementState;
  color: string;
  on: string;
  size?: number;
  pop?: boolean;
}) {
  const { def, unlocked } = state;
  const tilt = TILTS[hash(def.id) % TILTS.length];
  const text = def.badge;
  const fs = text.length >= 4 ? size * 0.26 : text.length === 3 ? size * 0.32 : size * 0.4;
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[22%] border-(length:--bw) ${
        unlocked ? "border-ink shadow-[4px_4px_0_0_var(--ink)]" : "border-dashed border-ink-faint text-ink-faint"
      } ${pop ? "motion-safe:animate-[sticker-pop_600ms_cubic-bezier(.2,1.6,.4,1)_both]" : ""}`}
      style={{
        width: size,
        height: size,
        background: unlocked ? color : "transparent",
        color: unlocked ? on : undefined,
        transform: unlocked ? `rotate(${tilt}deg)` : undefined,
        ["--tilt" as string]: `${tilt}deg`,
      }}
    >
      <span className="display num" style={{ fontSize: fs, lineHeight: 1 }}>
        {text}
      </span>
    </div>
  );
}
