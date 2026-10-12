/**
 * Strum detector. Feed it loudness (RMS) readings over time and it reports a
 * new strum when the level jumps sharply above its recent low point. Simple,
 * but a strum's attack is much louder than the ringing just before it.
 */
export class OnsetDetector {
  private history: { t: number; rms: number }[] = [];
  private lastOnset = -Infinity;

  constructor(
    private opts = {
      minRms: 0.02, // ignore anything quieter than this
      ratio: 1.35, // must rise this much above the recent low point
      minJump: 0.02, // and by at least this much in absolute terms
      windowMs: 150, // how far back "recent" goes
      refractoryMs: 170, // fastest believable gap between strums
    },
  ) {}

  /** Returns true when this reading starts a new strum. */
  push(rms: number, t: number): boolean {
    const { minRms, ratio, minJump, windowMs, refractoryMs } = this.opts;
    const recent = this.history.filter((h) => t - h.t <= windowMs);
    this.history = [...recent, { t, rms }];
    if (!recent.length) return false;

    // Compare against the quietest moment just before now. A new strum is a
    // sharp rise from there, even if earlier chords are still ringing.
    const floor = Math.min(...recent.map((h) => h.rms));
    if (
      rms >= minRms &&
      rms > floor * ratio &&
      rms - floor >= minJump &&
      t - this.lastOnset >= refractoryMs
    ) {
      this.lastOnset = t;
      return true;
    }
    return false;
  }

  reset(): void {
    this.history = [];
    this.lastOnset = -Infinity;
  }
}

export function rmsOf(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}
