/**
 * The order you learn chord changes in. Each pair is a measured skill: how
 * many clean switches you can make in 60 seconds.
 *
 * The first two pairs are open from day one. Every pair you get to
 * UNLOCK_AT opens the next one, so there's always a new pair close by.
 */
export const CHORD_PAIRS: [string, string][] = [
  ["Em", "Am"],
  ["Em", "G"],
  ["Am", "C"],
  ["G", "C"],
  ["G", "D"],
  ["D", "A"],
  ["Am", "E"],
  ["E", "A"],
  ["C", "D"],
  ["Am", "Dm"],
];

export const UNLOCK_AT = 20;
/** Milestones for changes per minute. 60 is a solid, song-ready switch. */
export const CHANGE_MILESTONES = [20, 30, 40, 50, 60];

export function pairId([a, b]: [string, string]): string {
  return `${a}-${b}`;
}

/** Next milestone above `best`, or null if they've cleared them all. */
export function nextMilestone(best: number | null): number | null {
  const b = best ?? 0;
  return CHANGE_MILESTONES.find((m) => m > b) ?? null;
}

/**
 * How many pairs are open, given each pair's best score.
 * `bests` maps pairId to best changes per minute.
 */
export function unlockedCount(bests: Record<string, number>): number {
  let n = 2;
  for (;;) {
    const passed = CHORD_PAIRS.slice(0, n).filter(
      (p) => (bests[pairId(p)] ?? 0) >= UNLOCK_AT,
    ).length;
    const next = Math.min(CHORD_PAIRS.length, 2 + passed);
    if (next === n) return n;
    n = next;
  }
}

export function unlockedPairs(bests: Record<string, number>): [string, string][] {
  return CHORD_PAIRS.slice(0, unlockedCount(bests));
}

/** Every chord that appears in an open pair, in learning order. */
export function knownChords(bests: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [a, b] of unlockedPairs(bests)) {
    if (!out.includes(a)) out.push(a);
    if (!out.includes(b)) out.push(b);
  }
  return out;
}
