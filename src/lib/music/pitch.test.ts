import { describe, expect, it } from "vitest";
import { centsOff, detectPitch, freqToMidi, midiToFreq, noteName, PitchSmoother } from "./pitch";

const SR = 44100;

/**
 * A guitar-ish tone. Default harmonics mimic a low string through a laptop
 * mic: the fundamental is almost gone and the overtones carry the sound.
 */
function tone(
  freq: number,
  n = 4096,
  amp = 0.5,
  harmonics = [0.05, 1, 0.8, 0.6, 0.4, 0.3],
  distort = false,
): Float32Array {
  const b = new Float32Array(n);
  let seed = 3;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.01;
  const total = harmonics.reduce((s, h) => s + h, 0);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    harmonics.forEach((h, k) => (v += h * Math.sin(2 * Math.PI * freq * (k + 1) * t + k)));
    v = (amp * v) / total;
    b[i] = (distort ? Math.tanh(6 * v) * 0.4 : v) + noise();
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

  for (const [label, midi] of cases) {
    it(`finds ${label} through a distortion pedal`, () => {
      expect(freqToMidi(detectPitch(tone(midiToFreq(midi), 4096, 0.5, undefined, true), SR))).toBe(midi);
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

describe("PitchSmoother", () => {
  it("ignores one stray reading", () => {
    const s = new PitchSmoother();
    const e2 = midiToFreq(40);
    for (let i = 0; i < 4; i++) s.push(e2);
    const shown = s.push(midiToFreq(52)); // one octave-up blip
    expect(freqToMidi(shown!)).toBe(40);
  });

  it("switches to a new string once it's steady", () => {
    const s = new PitchSmoother();
    for (let i = 0; i < 5; i++) s.push(midiToFreq(40));
    let shown: number | null = null;
    for (let i = 0; i < 5; i++) shown = s.push(midiToFreq(45));
    expect(freqToMidi(shown!)).toBe(45);
  });

  it("clears on silence", () => {
    const s = new PitchSmoother();
    for (let i = 0; i < 5; i++) s.push(midiToFreq(40));
    expect(s.push(-1)).toBeNull();
  });
});
