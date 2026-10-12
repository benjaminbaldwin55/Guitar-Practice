import { CHORDS, STRING_LABELS } from "@/lib/music/chords";

/** Classic chord box: nut on top, low E on the left. Numbers are fingers. */
export function ChordDiagram({
  id,
  size = 140,
  showName = true,
}: {
  id: string;
  size?: number;
  showName?: boolean;
}) {
  const ch = CHORDS[id];
  if (!ch) return null;
  const W = 100;
  const H = 128;
  const left = 14;
  const right = 86;
  const top = 26;
  const fretH = 20;
  const frets = 4;
  const sx = (i: number) => left + (i * (right - left)) / 5;
  const fy = (f: number) => top + f * fretH;

  return (
    <figure className="inline-flex flex-col items-center" style={{ width: size }}>
      {showName && (
        <figcaption className="display text-4xl" style={{ fontStretch: "110%" }}>
          {ch.id}
        </figcaption>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={size}
        role="img"
        aria-label={`${ch.name} chord`}
        className="mt-2 text-ink"
      >
        {/* nut */}
        <rect x={left - 1.5} y={top - 4} width={right - left + 3} height={5} fill="currentColor" />
        {/* frets */}
        {Array.from({ length: frets }, (_, f) => (
          <line key={f} x1={left} x2={right} y1={fy(f + 1)} y2={fy(f + 1)} stroke="currentColor" strokeWidth={1.5} />
        ))}
        {/* strings */}
        {STRING_LABELS.map((_, i) => (
          <line key={i} x1={sx(i)} x2={sx(i)} y1={top} y2={fy(frets)} stroke="currentColor" strokeWidth={i < 3 ? 2 : 1.4} />
        ))}
        {ch.frets.map((f, i) => {
          if (f === -1)
            return (
              <text key={i} x={sx(i)} y={top - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--live)">
                ×
              </text>
            );
          if (f === 0)
            return <circle key={i} cx={sx(i)} cy={top - 12} r={4} fill="none" stroke="currentColor" strokeWidth={1.8} />;
          const cy = fy(f) - fretH / 2;
          return (
            <g key={i}>
              <circle cx={sx(i)} cy={cy} r={7} fill="currentColor" />
              {ch.fingers[i] > 0 && (
                <text x={sx(i)} y={cy + 3.6} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--bg)">
                  {ch.fingers[i]}
                </text>
              )}
            </g>
          );
        })}
        {STRING_LABELS.map((l, i) => (
          <text key={l + i} x={sx(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--ink-dim)">
            {l}
          </text>
        ))}
      </svg>
    </figure>
  );
}
