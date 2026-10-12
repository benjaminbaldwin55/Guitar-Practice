// Pitch math and detection. Ported from the April 2026 app (legacy/index.html).

export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export function freqToMidi(f: number): number {
  return Math.round(12 * Math.log2(f / 440) + 69);
}

export function midiToFreq(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export function noteName(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12];
}

export function noteOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/** Cents from `freq` to the exact pitch of `midi`. Positive means sharp. */
export function centsOff(freq: number, midi: number): number {
  return 1200 * Math.log2(freq / midiToFreq(midi));
}

/**
 * Autocorrelation pitch detector. Returns the fundamental in Hz, or -1 when
 * the signal is too quiet or has no clear pitch.
 */
export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  minRms = 0.01,
): number {
  const N = buf.length;
  let rms = 0;
  for (let i = 0; i < N; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / N);
  if (rms < minRms) return -1;

  // Trim quiet edges so the correlation focuses on the steady part.
  let r1 = 0;
  let r2 = N - 1;
  const th = 0.2 * maxAbs(buf);
  for (let i = 0; i < N / 2; i++) {
    if (Math.abs(buf[i]) < th) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < N / 2; i++) {
    if (Math.abs(buf[N - i]) < th) {
      r2 = N - i;
      break;
    }
  }
  const b = buf.subarray(r1, r2);
  const M = b.length;
  if (M < 20) return -1;

  // Longest period we care about: about 60 Hz (below a low C).
  const maxLag = Math.min(M, Math.floor(sampleRate / 60));
  const c = new Float32Array(maxLag);
  for (let lag = 0; lag < maxLag; lag++) {
    let sum = 0;
    for (let j = 0; j < M - lag; j++) sum += b[j] * b[j + lag];
    c[lag] = sum;
  }

  // Skip the initial downslope, then take the highest peak.
  let d = 0;
  while (d < maxLag - 1 && c[d] > c[d + 1]) d++;
  let best = -Infinity;
  let pos = -1;
  for (let i = d; i < maxLag; i++) {
    if (c[i] > best) {
      best = c[i];
      pos = i;
    }
  }
  if (pos < 1 || pos >= maxLag - 1) return -1;

  // Parabolic interpolation for sub-sample accuracy.
  const x1 = c[pos - 1];
  const x2 = c[pos];
  const x3 = c[pos + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  const period = a ? pos - bb / (2 * a) : pos;
  return sampleRate / period;
}

function maxAbs(buf: Float32Array): number {
  let m = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i]);
    if (v > m) m = v;
  }
  return m;
}
