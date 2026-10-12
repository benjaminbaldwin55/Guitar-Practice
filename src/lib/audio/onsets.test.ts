import { describe, expect, it } from "vitest";
import { OnsetDetector } from "./onsets";

/**
 * Fake strum envelopes: a sharp attack then an exponential decay, sampled
 * every 10ms, with a little background noise.
 */
function envelope(strumTimesMs: number[], totalMs: number, opts = { peak: 0.3, decayMs: 400, noise: 0.004 }) {
  const out: { t: number; rms: number }[] = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let t = 0; t < totalMs; t += 10) {
    let v = opts.noise * rand();
    for (const s of strumTimesMs) {
      if (t >= s) v += opts.peak * Math.exp(-(t - s) / opts.decayMs);
    }
    out.push({ t, rms: v });
  }
  return out;
}

function count(samples: { t: number; rms: number }[]) {
  const d = new OnsetDetector();
  return samples.filter((s) => d.push(s.rms, s.t)).length;
}

describe("OnsetDetector", () => {
  it("counts slow, clear strums", () => {
    const strums = Array.from({ length: 20 }, (_, i) => 500 + i * 1500);
    expect(count(envelope(strums, 31000))).toBe(20);
  });

  it("counts fast changes (60 per minute)", () => {
    const strums = Array.from({ length: 60 }, (_, i) => 200 + i * 1000);
    expect(count(envelope(strums, 61000))).toBe(60);
  });

  it("counts strums that ring into each other", () => {
    const strums = Array.from({ length: 30 }, (_, i) => 200 + i * 700);
    expect(count(envelope(strums, 22000, { peak: 0.25, decayMs: 1500, noise: 0.004 }))).toBe(30);
  });

  it("ignores room noise", () => {
    expect(count(envelope([], 10000, { peak: 0, decayMs: 1, noise: 0.01 }))).toBe(0);
  });
});
