/**
 * Measures practice time from the wall clock, not from timer ticks.
 *
 * Browsers slow timers way down in background tabs (Chrome eventually fires
 * them about once a minute), so counting ticks loses time whenever you
 * switch to a YouTube lesson. Here each tick adds however much real time
 * actually passed since the last one.
 */
export class WallClock {
  private last: number | null = null;

  /** Start (or resume) measuring from `now` (ms). */
  start(now: number): void {
    this.last = now;
  }

  /** Stop measuring. Returns the seconds since the last tick. */
  stop(now: number): number {
    const d = this.tick(now);
    this.last = null;
    return d;
  }

  /** Seconds of real time since the last tick (0 if stopped). */
  tick(now: number): number {
    if (this.last === null) return 0;
    // A sleeping laptop can jump hours; cap one tick at 2 hours of practice.
    const d = Math.max(0, Math.min(7200, (now - this.last) / 1000));
    this.last = now;
    return d;
  }

  get running(): boolean {
    return this.last !== null;
  }
}

/** "4:05", or "+1:20" when you've gone past the planned time. */
export function formatClock(secondsLeft: number): string {
  const over = secondsLeft < 0;
  const s = Math.floor(Math.abs(secondsLeft));
  const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return over ? `+${txt}` : txt;
}
