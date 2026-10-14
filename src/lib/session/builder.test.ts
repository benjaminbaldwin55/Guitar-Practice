import { describe, expect, it } from "vitest";
import { unlockedCount, UNLOCK_AT, CHORD_PAIRS, pairId } from "@/content/chord-path";
import { buildSession, groupBests, startTempo, type BuildInput } from "./builder";

const base: BuildInput = {
  players: ["ben"],
  minutes: 20,
  energy: "normal",
  bests: {},
  recentRefs: [],
  seed: 1,
};

const total = (b: { plannedMin: number }[]) => b.reduce((n, x) => n + x.plannedMin, 0);

describe("chord path", () => {
  it("opens two pairs on day one and one more per passed pair", () => {
    expect(unlockedCount({})).toBe(2);
    expect(unlockedCount({ "Em-Am": UNLOCK_AT })).toBe(3);
    expect(unlockedCount({ "Em-Am": UNLOCK_AT, "Em-G": UNLOCK_AT, "Am-C": UNLOCK_AT })).toBe(5);
    const all = Object.fromEntries(CHORD_PAIRS.map((p) => [pairId(p), 99]));
    expect(unlockedCount(all)).toBe(CHORD_PAIRS.length);
  });

  it("ignores scores on pairs that aren't open yet", () => {
    expect(unlockedCount({ "G-D": 50 })).toBe(2);
  });
});

describe("buildSession", () => {
  it("always starts with a warm-up and ends with something fun", () => {
    for (const minutes of [10, 20, 30] as const) {
      for (const energy of ["low", "normal", "high"] as const) {
        for (let seed = 0; seed < 20; seed++) {
          const b = buildSession({ ...base, minutes, energy, seed });
          expect(b[0].kind).toBe("warmup");
          expect(b.at(-1)!.kind).toBe("fun");
          expect(total(b)).toBe(minutes);
        }
      }
    }
  });

  it("has a stretch break in long sessions (wrist)", () => {
    const b = buildSession({ ...base, minutes: 30 });
    expect(b.some((x) => x.kind === "break")).toBe(true);
  });

  it("works on the weakest open pair", () => {
    const b = buildSession({ ...base, bests: { ben: { "Em-Am": 15, "Em-G": 12 } } });
    expect(b.find((x) => x.kind === "edge")!.ref).toBe("changes:Em-G");
  });

  it("jumps on a newly opened pair", () => {
    // Passing Em-Am and Am-C opens G-C, which has no score yet.
    const b = buildSession({ ...base, bests: { ben: { "Em-Am": 25, "Em-G": 12, "Am-C": 30 } } });
    expect(b.find((x) => x.kind === "edge")!.ref).toBe("changes:G-C");
  });

  it("only uses chords you know", () => {
    for (let seed = 0; seed < 50; seed++) {
      const b = buildSession({ ...base, seed });
      for (const x of b) {
        const p = x.payload;
        const chords =
          p.type === "strum" ? p.chords : p.type === "progression" ? p.prog.chords : p.type === "changes" ? p.pair : [];
        for (const c of chords) expect(["Em", "Am", "G"]).toContain(c);
      }
    }
  });

  it("rotates the middle block away from what you did last time", () => {
    const first = buildSession({ ...base, seed: 3 });
    const recent = first.map((b) => b.ref!);
    const dueCat = (r: string) => r.split(":")[0];
    const firstCat = dueCat(first.find((b) => b.kind === "due")!.ref!);
    const second = buildSession({ ...base, seed: 4, recentRefs: recent });
    expect(dueCat(second.find((b) => b.kind === "due")!.ref!)).not.toBe(firstCat);
    expect(second.at(-1)!.ref).not.toBe(first.at(-1)!.ref);
  });

  it("never gives a solo session a together-only idea, and vice versa", () => {
    for (let seed = 0; seed < 40; seed++) {
      const solo = buildSession({ ...base, seed }).at(-1)!.payload;
      const duo = buildSession({ ...base, players: ["ben", "anna"], seed }).at(-1)!.payload;
      if (solo.type === "fun") expect(solo.idea.together).toBeFalsy();
      if (duo.type === "fun") expect(duo.idea.solo).toBeFalsy();
    }
  });

  it("plans together sessions around the weaker player", () => {
    expect(groupBests(["ben", "anna"], { ben: { "Em-G": 40 }, anna: { "Em-G": 15 } })).toEqual({ "Em-G": 15 });
  });
});

describe("startTempo", () => {
  it("starts halfway between last start and last best", () => {
    expect(startTempo("scale:am-pent-1", ["ben"], { ben: { "scale:am-pent-1": { start: 60, top: 80 } } }, 60).bpm).toBe(70);
  });

  it("uses the default the first time", () => {
    expect(startTempo("scale:am-pent-1", ["ben"], {}, 60).bpm).toBe(60);
  });

  it("never starts above last time's start when nothing was nailed", () => {
    expect(startTempo("strum:campfire", ["ben"], { ben: { "strum:campfire": { start: 70, top: 0 } } }, 60).bpm).toBe(70);
  });

  it("goes with the slower player together", () => {
    const t = { ben: { x: { start: 80, top: 100 } }, anna: { x: { start: 60, top: 64 } } };
    expect(startTempo("x", ["ben", "anna"], t, 50).bpm).toBe(62);
  });
});

describe("tempo carry-over in sessions", () => {
  it("builds scale blocks at the remembered tempo", () => {
    const tempos = { ben: { "scale:am-pent-1": { start: 60, top: 84 }, "scale:em-pent-open": { start: 60, top: 84 } } };
    for (let seed = 0; seed < 30; seed++) {
      const b = buildSession({ ...base, minutes: 30, seed, tempos });
      for (const x of b) if (x.payload.type === "scale") expect(x.payload.bpm).toBe(72);
    }
  });
});

describe("shuffle", () => {
  it("changes most of the plan when there are alternatives", () => {
    for (const minutes of [10, 20, 30] as const) {
      for (let seed = 0; seed < 20; seed++) {
        const first = buildSession({ ...base, minutes, seed });
        const second = buildSession({ ...base, minutes, seed: seed + 1, avoid: first.map((b) => b.ref!) });
        const changed = first.filter((b, i) => b.kind !== "break" && b.ref !== second[i]?.ref).length;
        const compared = first.filter((b) => b.kind !== "break").length;
        // Warm-up, chord pair, middle block(s) and fun should all move on day one.
        expect(changed).toBe(compared);
      }
    }
  });
});

describe("Anna's pick grip", () => {
  it("checks her pick grip in her first sessions, then rotates it out", () => {
    const first = buildSession({ ...base, players: ["anna"] });
    expect(first[0].ref).toContain("pick-grip");
    const later = buildSession({ ...base, players: ["anna"], recentRefs: Array(6).fill("warmup:prayer+shake-out+chromatic-1234") });
    expect(later[0].ref).not.toContain("pick-grip");
    expect(buildSession({ ...base, players: ["ben"] })[0].ref).not.toContain("pick-grip");
  });
});
