import type { AchievementState, Group } from "@/lib/achievements";
import { ICONS } from "./icons";

const TILTS = [-4, 3, -2, 4, -3, 2];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Each family of achievements has its own sticker shape. */
const SHAPES: Record<Group, string> = {
  // a guitar pick
  "showing-up": "M48 6C26 6 9 15 9 32c0 22 22 45 39 60 17-15 39-38 39-60C87 15 70 6 48 6z",
  // a chunky rounded square
  changes: "M26 8h44a18 18 0 0 1 18 18v44a18 18 0 0 1-18 18H26A18 18 0 0 1 8 70V26A18 18 0 0 1 26 8z",
  // a circle, like a dial
  speed: "M48 6a42 42 0 1 0 0.01 0z",
  // a hexagon
  explorer: "M48 5 86 27v42L48 91 10 69V27z",
  // a heart
  together: "M48 88S8 64 8 34a20 20 0 0 1 40-6 20 20 0 0 1 40 6c0 30-40 54-40 54z",
  // a starburst
  ahead:
    "M48 4l9 13 15-6 2 16 16 3-7 14 11 12-14 8 4 15-16-1-6 15-14-9-14 9-6-15-16 1 4-15-14-8 11-12-7-14 16-3 2-16 15 6z",
};

/** Where the icon sits inside each shape (center x, y). */
const ICON_CENTER: Record<Group, [number, number]> = {
  "showing-up": [48, 36],
  changes: [48, 44],
  speed: [48, 44],
  explorer: [48, 46],
  together: [48, 42],
  ahead: [48, 46],
};

/** Pick an icon for an achievement from its id. */
export function iconFor(id: string): string {
  const table: [string, string][] = [
    ["first-session", "plug"],
    ["sessions-", "amp"],
    ["hours-", "hourglass"],
    ["days-", "calendar"],
    ["streak-", "flame"],
    ["first-changes", "swap"],
    ["pairs-open", "unlock"],
    ["best-change", "bolt"],
    ["switch-master", "crown"],
    ["first-nailed", "check"],
    ["clean-bpm", "metronome"],
    ["all-strums", "strum"],
    ["all-scales", "fretboard"],
    ["all-progressions", "path"],
    ["twelve-bar", "bars"],
    ["fun-sampler", "lollipop"],
    ["early", "sun"],
    ["late", "moon"],
    ["duo-sessions", "amp"],
    ["duo-hours", "hourglass"],
    ["duo-streak", "flame"],
    ["first-lick", "squiggle"],
    ["in-tune-bend", "bend"],
    ["echo", "echo"],
    ["five-boxes", "boxes"],
    ["first-song", "note"],
    ["first-barre", "barre"],
    ["by-ear", "ear"],
    ["first-solo", "bolt"],
    ["sals", "star"],
  ];
  return table.find(([p]) => id.startsWith(p))?.[1] ?? "star";
}

/**
 * An achievement as a die-cut sticker: a shape for its family, an icon, and
 * a small tag with the number. Earned ones are filled in the owner's color,
 * tilted, with the glowing hard shadow. Locked ones are dashed outlines.
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
  const shape = SHAPES[def.group];
  const [cx, cy] = ICON_CENTER[def.group];
  const iconScale = 2.05;
  const showTag = /\d/.test(def.badge);
  const tagW = Math.max(30, def.badge.length * 10 + 14);
  const muted = "var(--ink-faint)";

  return (
    <div
      aria-hidden
      className={`shrink-0 ${pop ? "motion-safe:animate-[sticker-pop_600ms_cubic-bezier(.2,1.6,.4,1)_both]" : ""}`}
      style={{
        width: size,
        height: size,
        transform: unlocked ? `rotate(${tilt}deg)` : undefined,
        ["--tilt" as string]: `${tilt}deg`,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} overflow="visible">
        {unlocked && <path d={shape} transform="translate(5 5)" fill="var(--shadow-c)" />}
        <path
          d={shape}
          fill={unlocked ? color : "transparent"}
          stroke={unlocked ? "var(--line)" : muted}
          strokeWidth={unlocked ? 3.5 : 3}
          strokeDasharray={unlocked ? undefined : "7 6"}
          strokeLinejoin="round"
        />
        <g
          transform={`translate(${cx - 12 * iconScale} ${cy - 12 * iconScale}) scale(${iconScale})`}
          fill="none"
          stroke={unlocked ? on : muted}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ICONS[iconFor(def.id)]} />
        </g>
        {showTag && (
          <g transform={`translate(${96 - tagW} 72)`}>
            <rect
              width={tagW}
              height={24}
              rx={12}
              fill={unlocked ? "var(--bg)" : "var(--bg)"}
              stroke={unlocked ? "var(--line)" : muted}
              strokeWidth={2.5}
            />
            <text
              x={tagW / 2}
              y={17}
              textAnchor="middle"
              fontSize={15}
              fontWeight={800}
              fill={unlocked ? "var(--ink)" : muted}
              style={{ fontStretch: "110%" }}
            >
              {def.badge}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
