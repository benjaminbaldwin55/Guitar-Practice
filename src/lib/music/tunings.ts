export interface Tuning {
  id: string;
  label: string;
  /** Low string to high string. */
  strings: { name: string; midi: number }[];
  note?: string;
}

const s = (name: string, midi: number) => ({ name, midi });

export const TUNINGS: Tuning[] = [
  {
    id: "standard",
    label: "Standard",
    strings: [s("E", 40), s("A", 45), s("D", 50), s("G", 55), s("B", 59), s("e", 64)],
  },
  {
    id: "drop-d",
    label: "Drop D",
    strings: [s("D", 38), s("A", 45), s("D", 50), s("G", 55), s("B", 59), s("e", 64)],
    note: "Low E down to D. Power chords with one finger.",
  },
  {
    id: "eb",
    label: "Half step down",
    strings: [s("Eb", 39), s("Ab", 44), s("Db", 49), s("Gb", 54), s("Bb", 58), s("eb", 63)],
    note: "Every string down a half step. Lots of 90s grunge lives here.",
  },
];

/** The string in `tuning` closest to `midi`, by semitones. */
export function nearestString(tuning: Tuning, freqMidiFloat: number): number {
  let best = 0;
  let bestDist = Infinity;
  tuning.strings.forEach((st, i) => {
    const d = Math.abs(st.midi - freqMidiFloat);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
