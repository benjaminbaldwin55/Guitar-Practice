export type Slot = "D" | "U" | "-";

export interface StrumPattern {
  id: string;
  name: string;
  slots: Slot[]; // 8 eighth notes: 1 & 2 & 3 & 4 &
  level: 1 | 2 | 3;
  tip: string;
  startBpm: number;
}

const p = (str: string): Slot[] => str.split("") as Slot[];

export const STRUMS: StrumPattern[] = [
  {
    id: "quarters",
    name: "Four downs",
    slots: p("D-D-D-D-"),
    level: 1,
    tip: "One down strum per beat. Like quarter notes on the hi-hat.",
    startBpm: 70,
  },
  {
    id: "eighths",
    name: "Down-up eighths",
    slots: p("DUDUDUDU"),
    level: 1,
    tip: "Down on the numbers, up on the &. Keep the wrist loose and the arm swinging.",
    startBpm: 60,
  },
  {
    id: "rock-push",
    name: "Down, down-up",
    slots: p("D-DUD-DU"),
    level: 2,
    tip: "Two-beat groove, repeated. Drummer brain: kick on 1 and 3, the ups are ghost notes.",
    startBpm: 65,
  },
  {
    id: "campfire",
    name: "The campfire strum",
    slots: p("D-DU-UDU"),
    level: 2,
    tip: "The pattern behind a huge number of acoustic songs. The miss on beat 3 is the trick: the hand still swings down, it just skips the strings.",
    startBpm: 60,
  },
  {
    id: "country-boom",
    name: "Boom-chick",
    slots: p("D-D-D-D-"),
    level: 2,
    tip: "Country feel. On 1 and 3 pick just the lowest note of the chord, on 2 and 4 strum the rest.",
    startBpm: 70,
  },
];

export const STRUM_BY_ID = Object.fromEntries(STRUMS.map((s) => [s.id, s]));
