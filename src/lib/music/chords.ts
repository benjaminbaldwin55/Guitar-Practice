/**
 * Open chord shapes. frets and fingers run low E to high e.
 * fret: -1 muted, 0 open, n fretted. finger: 1 index ... 4 pinky, 0 none.
 */
export interface ChordShape {
  id: string;
  name: string;
  frets: number[];
  fingers: number[];
  tip: string;
}

export const CHORDS: Record<string, ChordShape> = {
  Em: {
    id: "Em",
    name: "E minor",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    tip: "Two fingers, all six strings ring. The easiest chord on the guitar.",
  },
  Am: {
    id: "Am",
    name: "A minor",
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    tip: "Same shape as Em, moved over one string, plus your index on the B string.",
  },
  E: {
    id: "E",
    name: "E major",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    tip: "Em plus your index on the G string. Big and bright.",
  },
  A: {
    id: "A",
    name: "A major",
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    tip: "Three fingers in a row on fret 2. Tilt them so the high e can ring.",
  },
  C: {
    id: "C",
    name: "C major",
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    tip: "A staircase. Keep your fingers arched so the open G string rings.",
  },
  G: {
    id: "G",
    name: "G major",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    tip: "Wide stretch. Lead with the ring finger on the high e when you switch in.",
  },
  D: {
    id: "D",
    name: "D major",
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    tip: "A little triangle. Only strum the top four strings.",
  },
  Dm: {
    id: "Dm",
    name: "D minor",
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    tip: "D with the index dropped to fret 1. Sad and pretty.",
  },
};

export const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];
