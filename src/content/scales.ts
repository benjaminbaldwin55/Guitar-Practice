export interface ScaleNote {
  s: number; // string, 0 = low E ... 5 = high e
  f: number; // fret
  root?: boolean;
}

export interface ScaleShape {
  id: string;
  name: string;
  firstFret: number;
  lastFret: number;
  notes: ScaleNote[];
  tip: string;
}

export const SCALES: Record<string, ScaleShape> = {
  "am-pent-1": {
    id: "am-pent-1",
    name: "A minor pentatonic, box 1",
    firstFret: 5,
    lastFret: 8,
    notes: [
      { s: 0, f: 5, root: true }, { s: 0, f: 8 },
      { s: 1, f: 5 }, { s: 1, f: 7 },
      { s: 2, f: 5 }, { s: 2, f: 7, root: true },
      { s: 3, f: 5 }, { s: 3, f: 7 },
      { s: 4, f: 5 }, { s: 4, f: 8 },
      { s: 5, f: 5, root: true }, { s: 5, f: 8 },
    ],
    tip: "Index finger lives on fret 5, ring or pinky reaches for 7 and 8. The home base for blues and grunge solos.",
  },
  "em-pent-open": {
    id: "em-pent-open",
    name: "E minor pentatonic, open",
    firstFret: 0,
    lastFret: 3,
    notes: [
      { s: 0, f: 0, root: true }, { s: 0, f: 3 },
      { s: 1, f: 0 }, { s: 1, f: 2 },
      { s: 2, f: 0 }, { s: 2, f: 2, root: true },
      { s: 3, f: 0 }, { s: 3, f: 2 },
      { s: 4, f: 0 }, { s: 4, f: 3 },
      { s: 5, f: 0, root: true }, { s: 5, f: 3 },
    ],
    tip: "The same shape as box 1, just using open strings. This is the key of E, where a lot of rock and country riffs live, Stay a Little Longer included.",
  },
};
