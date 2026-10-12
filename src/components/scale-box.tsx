import { SCALES } from "@/content/scales";

const LABELS = ["E", "A", "D", "G", "B", "e"];

/** Fretboard slice, drawn like tab: high e on top. Roots are filled red. */
export function ScaleBox({ id }: { id: string }) {
  const sc = SCALES[id];
  if (!sc) return null;
  const open = sc.firstFret === 0;
  const fretCount = sc.lastFret - sc.firstFret + (open ? 0 : 1);
  const W = 340;
  const H = 150;
  const left = open ? 44 : 30;
  const right = W - 10;
  const top = 16;
  const gap = 20;
  const slotW = (right - left) / Math.max(1, fretCount);
  const sy = (s: number) => top + (5 - s) * gap;
  const firstSlotFret = open ? 1 : sc.firstFret;
  const noteX = (f: number) =>
    f === 0 ? left - 18 : left + (f - firstSlotFret) * slotW + slotW / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md text-ink" role="img" aria-label={sc.name}>
      {LABELS.map((l, s) => (
        <g key={s}>
          <text x={6} y={sy(s) + 4} fontSize={11} fontWeight={700} fill="currentColor">
            {l}
          </text>
          <line x1={left} x2={right} y1={sy(s)} y2={sy(s)} stroke="currentColor" strokeWidth={s < 3 ? 2 : 1.3} />
        </g>
      ))}
      {Array.from({ length: fretCount + 1 }, (_, i) => (
        <line
          key={i}
          x1={left + i * slotW}
          x2={left + i * slotW}
          y1={sy(5) - 6}
          y2={sy(0) + 6}
          stroke="currentColor"
          strokeWidth={i === 0 && open ? 5 : 1.5}
        />
      ))}
      {Array.from({ length: fretCount }, (_, i) => (
        <text key={i} x={left + i * slotW + slotW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--ink-dim)">
          {firstSlotFret + i}
        </text>
      ))}
      {sc.notes.map((n, i) => (
        <circle
          key={i}
          cx={noteX(n.f)}
          cy={sy(n.s)}
          r={n.f === 0 ? 6 : 8}
          fill={n.root ? "var(--live)" : n.f === 0 ? "var(--bg)" : "currentColor"}
          stroke="currentColor"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}
