/**
 * Hand-drawn style icons on a 24x24 grid, all stroke-based with round caps
 * so they read as one family. Used by the nav and the achievement stickers.
 */
export const ICONS: Record<string, string> = {
  // nav
  home: "M4 11 12 4l8 7M6 10v10h12V10M10 20v-6h4v6",
  play: "M8 5v14l11-7z",
  tools: "M7 4v6a5 5 0 0 0 10 0V4M12 15v6M9 21h6",
  songs: "M9 17V5l10-2v12M9 17a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 15a3 3 0 1 1-3-3 3 3 0 0 1 3 3z",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",

  // achievements
  plug: "M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0zM12 17v4",
  amp: "M3 6h18v13H3zM9 13m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M16 10h2M16 14h2",
  hourglass: "M7 3h10M7 21h10M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v5M15 3v5M9 15h2",
  flame: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z",
  unlock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-2M12 15v2",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  crown: "M3 19h18M4 19 3 8l5 4 4-7 4 7 5-4-1 11z",
  swap: "M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4",
  metronome: "M7 21 10 3h4l3 18zM12 16l5-9M8.5 15h7",
  check: "M5 12.5l4.5 4.5L19 7",
  strum: "M8 4v15M5 16l3 3 3-3M16 20V5M13 8l3-3 3 3",
  fretboard: "M3 7h18v10H3zM9 7v10M15 7v10M3 12h18",
  path: "M5 18c3-8 5-11 7-11s4 6 7 3M5 18m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M19 10m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0",
  bars: "M3 7h18M3 11h18M3 15h18M7 5v12M17 5v12",
  lollipop: "M10 10m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M10 10a2.5 2.5 0 1 1 2.5-2.5M14.5 14.5 21 21",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  hearts: "M9 18s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7zM15 13s3-2 3-5a2.3 2.3 0 0 0-3.5-1.8",
  note: "M9 17V5l10-2v12M9 17a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 15a3 3 0 1 1-3-3 3 3 0 0 1 3 3z",
  barre: "M5 3v18M10 3v18M15 3v18M19 3v18M3 9h18",
  ear: "M7 10a5 5 0 0 1 10 0c0 4-4 4-4 8a3 3 0 0 1-6 0M10 10a2 2 0 0 1 4 0",
  squiggle: "M3 13c2-4 4-4 6 0s4 4 6 0 4-4 6 0",
  bend: "M5 20c7 0 10-5 10-14M11 9l4-4 4 4",
  echo: "M4 12h3M9 8a5 5 0 0 1 0 8M13 5a9 9 0 0 1 0 14M17 3a12 12 0 0 1 0 18",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  boxes: "M3 5h6v6H3zM15 5h6v6h-6zM9 13h6v6H9zM3 13h4M17 13h4",
};

export function Icon({
  name,
  size = 22,
  stroke = 2.2,
  className = "",
}: {
  name: keyof typeof ICONS | string;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={ICONS[name] ?? ICONS.star} />
    </svg>
  );
}
