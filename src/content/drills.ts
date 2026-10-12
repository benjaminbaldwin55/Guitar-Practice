/** Chord progressions to strum through. Only offered once you know the chords. */
export interface Progression {
  id: string;
  name: string;
  chords: string[];
  /** Bars per chord, in order. Defaults to 1 each. */
  bars?: number[];
  strum: string;
  bpm: number;
  how: string;
}

export const PROGRESSIONS: Progression[] = [
  {
    id: "grunge-vamp",
    name: "Two-chord grunge vamp",
    chords: ["Em", "G"],
    bars: [2, 2],
    strum: "rock-push",
    bpm: 70,
    how: "Two bars of Em, two bars of G, on repeat. Dig in on the down strums.",
  },
  {
    id: "minor-sway",
    name: "Minor sway",
    chords: ["Em", "Am"],
    bars: [2, 2],
    strum: "eighths",
    bpm: 65,
    how: "Moody and simple. Let the Em ring out before you move.",
  },
  {
    id: "four-chord",
    name: "The four-chord loop",
    chords: ["G", "D", "Em", "C"],
    strum: "campfire",
    bpm: 70,
    how: "One bar each. This loop sits under a huge number of pop, rock and country songs. Once it's smooth you can sing almost anything over it.",
  },
  {
    id: "country-145",
    name: "Country one-four-five in G",
    chords: ["G", "C", "G", "D"],
    strum: "country-boom",
    bpm: 80,
    how: "G, C, G, D, one bar each. Bass note then strum, the classic boom-chick.",
  },
  {
    id: "blues-12-a",
    name: "12-bar blues in A",
    chords: ["A", "D", "A", "E", "D", "A", "E"],
    bars: [4, 2, 2, 1, 1, 1, 1],
    strum: "rock-push",
    bpm: 80,
    how: "Four bars A, two D, two A, then E, D, A, E one bar each. The backbone of blues and early rock. Count the bars out loud at first.",
  },
  {
    id: "minor-climb",
    name: "Minor climb",
    chords: ["Am", "C", "D", "Am"],
    strum: "campfire",
    bpm: 65,
    how: "Am, C, D, back to Am. A darker cousin of the four-chord loop.",
  },
  {
    id: "e-a-boogie",
    name: "E to A boogie",
    chords: ["E", "A"],
    bars: [2, 2],
    strum: "rock-push",
    bpm: 85,
    how: "Big open E, big open A. Turn the gain up a notch and hit it hard.",
  },
];

/** Something fun to end on. Never a test. */
export interface FunIdea {
  id: string;
  title: string;
  how: string;
  needs?: string[]; // chords that must be known
  together?: boolean; // only for Ben + Anna
  solo?: boolean; // only for one person
  chill?: boolean; // good for low energy
  scale?: string;
}

export const FUN: FunIdea[] = [
  {
    id: "looper-jam",
    title: "Looper jam",
    how: "Record four bars of Em to G on the RC-1. Then play over it with the E minor pentatonic. There are no wrong notes in that box.",
    needs: ["Em", "G"],
    scale: "em-pent-open",
  },
  {
    id: "dirty-slow",
    title: "Make it sound like 1992",
    how: "Kick on the DS-1. Play Em and G with big, slow down strums and let them ring into each other. Loud is the point.",
    needs: ["Em", "G"],
  },
  {
    id: "pent-noodle",
    title: "Pentatonic noodle",
    how: "Metronome at 70. Wander around the A minor pentatonic box. Try bending a note on the G or B string. No plan, just sound.",
    scale: "am-pent-1",
    chill: true,
  },
  {
    id: "play-what-you-know",
    title: "Play something you already know",
    how: "Anything at all: a riff, part of a song, the chords you like best. Just enjoy playing it.",
    chill: true,
    solo: true,
  },
  {
    id: "sing-along",
    title: "Sing-along",
    how: "One of you strums the four-chord loop, the other sings any melody that fits. Hum if you don't know the words. Swap after a few rounds.",
    needs: ["G", "D", "Em", "C"],
    together: true,
  },
  {
    id: "call-response",
    title: "Call and response",
    how: "One plays a short 3 or 4 note phrase in the A minor pentatonic box, the other copies it by ear. Take turns leading.",
    scale: "am-pent-1",
    together: true,
  },
  {
    id: "rhythm-and-lead",
    title: "Rhythm and lead",
    how: "One strums Em to Am slowly, the other plays single notes from the E minor pentatonic over it. Swap after a couple of minutes.",
    needs: ["Em", "Am"],
    scale: "em-pent-open",
    together: true,
    chill: true,
  },
  {
    id: "tone-tweak",
    title: "Tone hunt",
    how: "Strum one chord you love and play with the THR10II and the Yellow Fall delay until it sounds like a record you like. Snap a photo of the knobs.",
    chill: true,
  },
];
