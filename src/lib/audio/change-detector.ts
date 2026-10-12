import { blend, chordTemplate, chromaOf, cosine, normalize, type Chroma } from "../music/chroma";

export interface DetectorFrame {
  /** Which chord of the pair is ringing: 0, 1, or null if unclear or quiet. */
  label: 0 | 1 | null;
  /** True on the frame where a change to the other chord is confirmed. */
  counted: boolean;
  level: number;
}

export interface DetectorOptions {
  margin: number; // how much closer to one chord than the other
  minSimilarity: number; // how chord-like the sound must be at all
  stableFrames: number; // consecutive frames before we believe a chord
  minGapMs: number; // fastest believable change
  minLevel: number; // absolute quiet floor
}

const DEFAULTS: DetectorOptions = {
  margin: 0.03,
  minSimilarity: 0.55,
  stableFrames: 3,
  minGapMs: 250,
  minLevel: 0.0015,
};

/**
 * Counts chord changes between two known chords by listening for which one
 * is ringing. It counts only when the sound settles on the *other* chord, so
 * re-strumming the same chord or a double strum can't add a change, and
 * volume doesn't matter beyond being above the room noise.
 */
export class ChangeDetector {
  templates: [Chroma, Chroma];
  private opts: DetectorOptions;
  private floor = Infinity;
  private run: { label: 0 | 1 | null; n: number } = { label: null, n: 0 };
  private current: 0 | 1 | null = null;
  private lastCountAt = -Infinity;
  count = 0;

  constructor(pair: [string, string], opts: Partial<DetectorOptions> = {}) {
    this.templates = [chordTemplate(pair[0]), chordTemplate(pair[1])];
    this.opts = { ...DEFAULTS, ...opts };
  }

  /** Teach it how this guitar sounds: chroma frames captured while one chord rang. */
  calibrate(side: 0 | 1, frames: Chroma[]): void {
    if (!frames.length) return;
    const avg = new Float64Array(12);
    for (const f of frames) for (let i = 0; i < 12; i++) avg[i] += f[i];
    this.templates[side] = blend(this.templates[side], normalize(avg));
  }

  /** Start counting from zero (after calibration). */
  reset(): void {
    this.floor = Infinity;
    this.run = { label: null, n: 0 };
    this.current = null;
    this.lastCountAt = -Infinity;
    this.count = 0;
  }

  /** Zero the count but keep the room's noise floor (learned during the count-in). */
  restartCount(): void {
    this.run = { label: null, n: 0 };
    this.current = null;
    this.lastCountAt = -Infinity;
    this.count = 0;
  }

  /** Is this frame loud enough to be a guitar rather than the room? */
  audible(frame: Float32Array): { ok: boolean; level: number } {
    let s = 0;
    for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
    const level = Math.sqrt(s / frame.length);
    // The room's noise floor is the quietest moment we've heard. It never
    // creeps up while you play, so nonstop strumming can't gate itself out.
    if (level < this.floor) this.floor = level;
    return { ok: level > Math.max(this.opts.minLevel, this.floor * 3), level };
  }

  classify(chroma: Chroma): 0 | 1 | null {
    const a = cosine(chroma, this.templates[0]);
    const b = cosine(chroma, this.templates[1]);
    if (Math.max(a, b) < this.opts.minSimilarity) return null;
    if (a - b > this.opts.margin) return 0;
    if (b - a > this.opts.margin) return 1;
    return null;
  }

  push(frame: Float32Array, sampleRate: number, tMs: number): DetectorFrame {
    const { ok, level } = this.audible(frame);
    const label = ok ? this.classify(chromaOf(frame, sampleRate)) : null;

    if (label !== null && label === this.run.label) this.run.n++;
    else this.run = { label, n: label === null ? 0 : 1 };

    let counted = false;
    if (this.run.label !== null && this.run.n >= this.opts.stableFrames) {
      if (this.current === null) {
        this.current = this.run.label;
      } else if (this.run.label !== this.current && tMs - this.lastCountAt >= this.opts.minGapMs) {
        this.current = this.run.label;
        this.lastCountAt = tMs;
        this.count++;
        counted = true;
      }
    }
    return { label, counted, level };
  }
}
