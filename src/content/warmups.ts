export interface WarmupStep {
  id: string;
  kind: "stretch" | "fingers";
  title: string;
  seconds: number;
  how: string;
}

/** Stretches carried over from the old program, plus a few finger drills. */
export const WARMUPS: WarmupStep[] = [
  { id: "wrist-circles", kind: "stretch", title: "Wrist circles", seconds: 30, how: "Slow circles, 10 each direction, both hands." },
  { id: "prayer", kind: "stretch", title: "Prayer stretch", seconds: 30, how: "Palms together in front of your chest, elbows out. Lower your hands until you feel it. Hold." },
  { id: "reverse-prayer", kind: "stretch", title: "Reverse prayer", seconds: 30, how: "Backs of your hands together, fingers pointing down. Hold gently." },
  { id: "finger-spreads", kind: "stretch", title: "Finger spreads", seconds: 30, how: "Spread all fingers wide for 5 seconds, relax. Five times." },
  { id: "forearm-flex", kind: "stretch", title: "Forearm stretch", seconds: 40, how: "Arm straight out, palm up. Gently pull the fingers back with your other hand for 15 seconds. Then palm down. Switch arms." },
  { id: "shake-out", kind: "stretch", title: "Shake it out", seconds: 20, how: "Drop your arms and shake your hands loose. Roll your shoulders back a few times." },

  { id: "chromatic-1234", kind: "fingers", title: "Spider walk 1-2-3-4", seconds: 90, how: "Frets 1, 2, 3, 4 on the low E with fingers 1, 2, 3, 4. Then the A string, all the way to high e and back. One finger per fret, slow and clean." },
  { id: "chromatic-1324", kind: "fingers", title: "Spider walk 1-3-2-4", seconds: 90, how: "Same idea, scrambled: frets 1, 3, 2, 4. Wakes up the ring and pinky." },
  { id: "chromatic-up-neck", kind: "fingers", title: "Spider walk at fret 5", seconds: 90, how: "1-2-3-4 starting at fret 5, where the frets are closer together. Easier on the stretch." },
  { id: "open-string-picking", kind: "fingers", title: "Open string picking", seconds: 60, how: "Pick each open string 4 times, low to high and back. Keep the pick hand loose. No fretting at all." },
  { id: "finger-lifts", kind: "fingers", title: "Hammer and lift", seconds: 75, how: "Index on fret 5 of the G string. Tap fret 7 with your ring finger and lift, over and over, letting it ring. Then pinky on fret 8." },
];

export const WARMUP_BY_ID = Object.fromEntries(WARMUPS.map((w) => [w.id, w]));
