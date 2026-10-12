import { magnitudes } from "../audio/fft";
import { CHORDS } from "./chords";

export type Chroma = Float64Array; // 12 pitch classes, C = 0

const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/**
 * How much of each pitch class is in a frame. Low and very high bins are
 * ignored; magnitudes are square-rooted so one loud string can't dominate.
 */
export function chromaOf(frame: Float32Array, sampleRate: number): Chroma {
  const mags = magnitudes(frame);
  const n = frame.length;
  const c = new Float64Array(12);
  const lo = Math.ceil((70 * n) / sampleRate);
  const hi = Math.min(mags.length - 1, Math.floor((2200 * n) / sampleRate));
  for (let k = lo; k <= hi; k++) {
    const f = (k * sampleRate) / n;
    const midi = 12 * Math.log2(f / 440) + 69;
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    // Bins far from a semitone center are mostly leakage; weight them down.
    const off = Math.abs(midi - Math.round(midi));
    c[pc] += Math.sqrt(mags[k]) * (1 - off);
  }
  return normalize(c);
}

export function normalize(c: Chroma): Chroma {
  let s = 0;
  for (const v of c) s += v * v;
  s = Math.sqrt(s) || 1;
  return c.map((v) => v / s) as Chroma;
}

export function cosine(a: Chroma, b: Chroma): number {
  let s = 0;
  for (let i = 0; i < 12; i++) s += a[i] * b[i];
  return s;
}

/**
 * What a chord should sound like, built from the exact shape the app
 * teaches: one entry per played string, plus a bit of each string's
 * strongest overtones (the fifth and major third above).
 */
export function chordTemplate(chordId: string): Chroma {
  const shape = CHORDS[chordId];
  const c = new Float64Array(12);
  shape.frets.forEach((f, i) => {
    if (f < 0) return;
    const pc = (OPEN_MIDI[i] + f) % 12;
    c[pc] += 1;
    c[(pc + 7) % 12] += 0.35;
    c[(pc + 4) % 12] += 0.15;
  });
  return normalize(c);
}

/** Blend a measured chroma into a template (used by calibration). */
export function blend(template: Chroma, measured: Chroma, weight = 0.6): Chroma {
  return normalize(template.map((v, i) => v * (1 - weight) + measured[i] * weight) as Chroma);
}
