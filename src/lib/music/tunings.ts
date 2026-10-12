import { NOTE_NAMES } from "./pitch";

export interface Tuning {
  id: string;
  label: string;
  /** Low string to high string. */
  strings: { name: string; midi: number }[];
  note?: string;
}

const s = (name: string, midi: number) => ({ name, midi });

/** Every preset tuning. Players keep a short list of the ones they use. */
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
  {
    id: "d-standard",
    label: "Full step down",
    strings: [s("D", 38), s("G", 43), s("C", 48), s("F", 53), s("A", 57), s("d", 62)],
    note: "Every string down a whole step. Heavy and loose.",
  },
  {
    id: "drop-db",
    label: "Drop C#",
    strings: [s("C#", 37), s("G#", 44), s("C#", 49), s("F#", 54), s("A#", 58), s("d#", 63)],
    note: "Half step down, then drop the low string another whole step.",
  },
  {
    id: "drop-c",
    label: "Drop C",
    strings: [s("C", 36), s("G", 43), s("C", 48), s("F", 53), s("A", 57), s("d", 62)],
    note: "Full step down, then drop the low string another whole step.",
  },
  {
    id: "open-g",
    label: "Open G",
    strings: [s("D", 38), s("G", 43), s("D", 50), s("G", 55), s("B", 59), s("d", 62)],
    note: "Strum the open strings and you get a G chord. Slide guitar and blues.",
  },
  {
    id: "open-d",
    label: "Open D",
    strings: [s("D", 38), s("A", 45), s("D", 50), s("F#", 54), s("A", 57), s("d", 62)],
    note: "Open strings make a D chord. Big and ringing.",
  },
  {
    id: "open-e",
    label: "Open E",
    strings: [s("E", 40), s("B", 47), s("E", 52), s("G#", 56), s("B", 59), s("e", 64)],
    note: "Open strings make an E chord. Raises three strings, so go easy.",
  },
  {
    id: "dadgad",
    label: "DADGAD",
    strings: [s("D", 38), s("A", 45), s("D", 50), s("G", 55), s("A", 57), s("d", 62)],
    note: "Airy and droney. Celtic and folk favorite.",
  },
  {
    id: "double-drop-d",
    label: "Double drop D",
    strings: [s("D", 38), s("A", 45), s("D", 50), s("G", 55), s("B", 59), s("d", 62)],
    note: "Drop D with the high string dropped too.",
  },
];

export const DEFAULT_TUNING_LIST = ["standard", "drop-d", "eb"];

/** Build a custom tuning from six midi notes, low to high. */
export function customTuning(midis: number[]): Tuning {
  const names = midis.map((m, i) => {
    const n = NOTE_NAMES[((m % 12) + 12) % 12];
    return i === 5 ? n.toLowerCase() : n;
  });
  return {
    id: `custom:${midis.join("-")}`,
    label: names.map((n) => n.toUpperCase()).join(" "),
    strings: midis.map((m, i) => ({ name: names[i], midi: m })),
    note: "Your custom tuning.",
  };
}

export function findTuning(id: string): Tuning | undefined {
  if (id.startsWith("custom:")) {
    const midis = id.slice(7).split("-").map(Number);
    if (midis.length === 6 && midis.every((m) => m > 20 && m < 80)) return customTuning(midis);
    return undefined;
  }
  return TUNINGS.find((t) => t.id === id);
}

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
