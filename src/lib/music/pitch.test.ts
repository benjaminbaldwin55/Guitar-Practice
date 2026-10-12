import { describe, expect, it } from "vitest";
import { centsOff, detectPitch, freqToMidi, midiToFreq, noteName } from "./pitch";

const SR = 44100;

/** A guitar-ish tone: fundamental plus a few harmonics. */
function tone(freq: number, n = 4096, amp = 0.5): Float32Array {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] =
      amp *
      (Math.sin(2 * Math.PI * freq * t) +
        0.5 * Math.sin(2 * Math.PI * 2 * freq * t) +
        0.25 * Math.sin(2 * Math.PI * 3 * freq * t)) /
      1.75;
  }
  return b;
}

describe("pitch math", () => {
  it("converts between Hz and notes", () => {
    expect(freqToMidi(440)).toBe(69);
    expect(noteName(40)).toBe("E");
    expect(midiToFreq(40)).toBeCloseTo(82.41, 1);
    expect(centsOff(midiToFreq(45) * 1.01, 45)).toBeCloseTo(17.2, 0);
  });
});

describe("detectPitch", () => {
  // Every open string in standard, plus low D (Drop D) and low Eb.
  const cases: [string, number][] = [
    ["low D", 38],
    ["low Eb", 39],
    ["low E", 40],
    ["A", 45],
    ["D", 50],
    ["G", 55],
    ["B", 59],
    ["high e", 64],
  ];
  for (const [label, midi] of cases) {
    it(`finds ${label} within 3 cents`, () => {
      const f = midiToFreq(midi);
      const got = detectPitch(tone(f), SR);
      expect(freqToMidi(got)).toBe(midi);
      expect(Math.abs(centsOff(got, midi))).toBeLessThan(3);
    });
  }

  it("hears a string that's 20 cents flat as flat", () => {
    const f = midiToFreq(45) * Math.pow(2, -20 / 1200);
    const c = centsOff(detectPitch(tone(f), SR), 45);
    expect(c).toBeLessThan(-15);
    expect(c).toBeGreaterThan(-25);
  });

  it("ignores silence", () => {
    expect(detectPitch(new Float32Array(4096), SR)).toBe(-1);
    expect(detectPitch(tone(110, 4096, 0.001), SR)).toBe(-1);
  });
});
