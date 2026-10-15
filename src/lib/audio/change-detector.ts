import { blend, chordTemplate, chromaOf, cosine, normalize, type Chroma } from "../music/chroma";

export interface DetectorFrame {
  /** Which chord of the pair is ringing: 0, 1, or null if unclear or quiet. */
  label: 0 | 1 | null;
  /** True on the frame where a change to the other chord is confirmed. */
  counted: boolean;
  level: number;
  /** How much it sounds like each chord (0 to 1), or null if too quiet to tell. */
  sims: [number, number] | null;
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
  minSimilarity: 0.45,
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
  readonly opts: DetectorOptions;
  /** Typical level of the room with nobody playing. 0 until we've heard it. */
  noise = 0;
  private roomLevels: number[] = [];
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

  /**
   * Learn the room's background level from moments with nobody playing.
   * Uses a low percentile of recent readings, so a strum or two mixed in
   * doesn't push it up, and ignores the dead-silent frames a mic sends while
   * it's starting up (those made the old version think the room was
   * perfectly quiet, so room hiss passed as guitar).
   */
  hearRoom(level: number): void {
    if (level < 1e-6) return;
    this.roomLevels.push(level);
    if (this.roomLevels.length > 40) this.roomLevels.shift();
    const sorted = [...this.roomLevels].sort((a, b) => a - b);
    this.noise = sorted[Math.floor(sorted.length * 0.25)];
  }

  /** The level a sound has to beat to count as guitar. */
  get gate(): number {
    return Math.max(this.opts.minLevel, this.noise * 3);
  }

  /** How many room readings we have. */
  get roomFrames(): number {
    return this.roomLevels.length;
  }

  /** Start counting from zero and forget the room. */
  reset(): void {
    this.noise = 0;
    this.roomLevels = [];
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
    // The room level is learned before you play and then held fixed, so
    // nonstop strumming can't gate itself out.
    return { ok: level > this.gate, level };
  }

  similarities(chroma: Chroma): [number, number] {
    return [cosine(chroma, this.templates[0]), cosine(chroma, this.templates[1])];
  }

  classify(chroma: Chroma): 0 | 1 | null {
    const [a, b] = this.similarities(chroma);
    if (Math.max(a, b) < this.opts.minSimilarity) return null;
    if (a - b > this.opts.margin) return 0;
    if (b - a > this.opts.margin) return 1;
    return null;
  }

  push(frame: Float32Array, sampleRate: number, tMs: number): DetectorFrame {
    const { ok, level } = this.audible(frame);
    const chroma = ok ? chromaOf(frame, sampleRate) : null;
    const sims = chroma ? this.similarities(chroma) : null;
    const label = chroma ? this.classify(chroma) : null;

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
    return { label, counted, level, sims };
  }
}

export function levelOf(frame: Float32Array): number {
  let s = 0;
  for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
  return Math.sqrt(s / frame.length);
}

export type CalibrationState = "listening-to-room" | "waiting-for-strum" | "ringing" | "done";

/**
 * Learns one chord's sound from a single strum. Listens to the room first,
 * waits for a clear jump in level (the strum), skips the pick attack, then
 * collects about half a second of the chord ringing. If the sound dies too
 * soon, it waits for another strum.
 */
export class Calibrator {
  frames: Chroma[] = [];
  state: CalibrationState = "listening-to-room";
  private skip = 0;

  constructor(
    private det: ChangeDetector,
    private need = 10, // frames of ringing to keep (~0.5s at a 50ms hop)
  ) {
    if (det.roomFrames >= 6) this.state = "waiting-for-strum";
  }

  push(frame: Float32Array, sampleRate: number): CalibrationState {
    const level = levelOf(frame);
    const { minLevel } = this.det.opts;

    if (this.state === "listening-to-room" || this.state === "waiting-for-strum") {
      const strum = Math.max(minLevel * 2, this.det.noise * 5);
      if (this.state === "waiting-for-strum" && level > strum) {
        this.state = "ringing";
        this.skip = 2; // skip the pick attack
        this.frames = [];
        return this.state;
      }
      this.det.hearRoom(level);
      if (this.det.roomFrames >= 6) this.state = "waiting-for-strum";
      return this.state;
    }

    if (this.state === "ringing") {
      if (level < Math.max(minLevel, this.det.noise * 2.5)) {
        // Died away. Keep what we got if it's enough, else wait for another strum.
        if (this.frames.length >= 6) return (this.state = "done");
        this.frames = [];
        return (this.state = "waiting-for-strum");
      }
      if (this.skip > 0) {
        this.skip--;
        return this.state;
      }
      this.frames.push(chromaOf(frame, sampleRate));
      if (this.frames.length >= this.need) this.state = "done";
    }
    return this.state;
  }
}
