import { describe, expect, it } from "vitest";
import { CHORDS } from "../music/chords";
import { chromaOf } from "../music/chroma";
import { ChangeDetector } from "./change-detector";

const SR = 48000;
const OPEN = [40, 45, 50, 55, 59, 64];

/** Karplus-Strong plucked string: a decent stand-in for a real guitar string. */
function pluck(freq: number, seconds: number, rand: () => number): Float32Array {
  const n = Math.floor(SR * seconds);
  const out = new Float32Array(n);
  const period = Math.round(SR / freq);
  const buf = Float32Array.from({ length: period }, () => rand() * 2 - 1);
  for (let i = 0; i < n; i++) {
    const j = i % period;
    const next = (j + 1) % period;
    const v = 0.4985 * (buf[j] + buf[next]);
    out[i] = buf[j];
    buf[j] = v;
  }
  return out;
}

interface Opts {
  changes: number;
  gain: number;
  restrum: boolean; // strum the same chord again halfway, which must not count
}

/** A run of strums alternating between two chords, roughly evenly spaced. */
function performance(pair: [string, string], o: Opts) {
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gap = 60 / (o.changes + 1);
  const total = Math.ceil(SR * (gap * (o.changes + 1) + 2));
  const out = new Float32Array(total);
  let lastFretted: number[] = [];
  const addStrum = (chord: string, at: number, g: number) => {
    CHORDS[chord].frets.forEach((f, s) => {
      if (f < 0) return;
      const x = pluck(440 * Math.pow(2, (OPEN[s] + f - 69) / 12), 1.5, rand);
      const start = at + Math.round(s * 0.012 * SR);
      for (let i = 0; i < x.length && start + i < out.length; i++) out[start + i] += x[i] * g;
    });
  };
  for (let c = 0; c <= o.changes; c++) {
    const at = Math.round((0.3 + c * gap) * SR);
    const chord = pair[c % 2];
    // Lifting fingers for the next chord quickly quiets what was ringing.
    if (c > 0) for (let i = at; i < Math.min(out.length, at + SR * 2); i++) out[i] *= Math.exp(-(i - at) / (SR * 0.05)) * 0.5 + 0.5 * (lastFretted.length ? 0.3 : 1);
    addStrum(chord, at, o.gain);
    if (o.restrum) addStrum(chord, at + Math.round(gap * 0.5 * SR), o.gain * 0.8);
    lastFretted = CHORDS[chord].frets.filter((f) => f > 0);
  }
  // a little room noise
  for (let i = 0; i < out.length; i++) out[i] += (rand() - 0.5) * 0.0004;
  return out;
}

function count(pair: [string, string], audio: Float32Array, calibrate = false) {
  const det = new ChangeDetector(pair);
  if (calibrate) {
    for (const side of [0, 1] as const) {
      const one = performance([pair[side], pair[side]], { changes: 0, gain: 0.1, restrum: false });
      const frames = [];
      for (let s = 2400; s + 8192 < SR; s += 2400) frames.push(chromaOf(one.subarray(s, s + 8192), SR));
      det.calibrate(side, frames);
    }
  }
  det.reset();
  for (let s = 0; s + 8192 < audio.length; s += 2400) det.push(audio.subarray(s, s + 8192), SR, ((s + 8192) / SR) * 1000);
  return det.count;
}

describe("ChangeDetector", () => {
  it("counts every change at 30 per minute", () => {
    expect(count(["Em", "G"], performance(["Em", "G"], { changes: 30, gain: 0.1, restrum: false }))).toBe(30);
  });

  it("doesn't count re-strumming the same chord", () => {
    expect(count(["Em", "Am"], performance(["Em", "Am"], { changes: 20, gain: 0.1, restrum: true }))).toBe(20);
  });

  it("works when you play quietly", () => {
    expect(count(["G", "C"], performance(["G", "C"], { changes: 20, gain: 0.01, restrum: false }))).toBe(20);
  });

  it("keeps up at 60 per minute after calibrating", () => {
    expect(count(["G", "D"], performance(["G", "D"], { changes: 60, gain: 0.1, restrum: false }), true)).toBe(60);
  });

  it("hears nothing in an empty room", () => {
    let seed = 1;
    const noise = Float32Array.from({ length: SR * 5 }, () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.0008);
    expect(count(["Em", "G"], noise)).toBe(0);
  });
});
