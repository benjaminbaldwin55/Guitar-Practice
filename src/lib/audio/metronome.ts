import { getAudioContext } from "./context";

export type Subdivision = 1 | 2 | 3 | 4;

export interface Tick {
  bar: number;
  beat: number; // 0-based beat in the bar
  sub: number; // 0-based subdivision within the beat
}

export interface MetronomeOptions {
  bpm: number;
  beatsPerBar: number;
  subdivision: Subdivision;
  accent: boolean;
}

export const MIN_BPM = 30;
export const MAX_BPM = 250;

export function clampBpm(n: number): number {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(n)));
}

/**
 * Click scheduler. Uses the classic lookahead pattern: a timer wakes up every
 * 25ms and books clicks on the audio clock slightly ahead, so timing stays
 * tight even when the UI is busy.
 */
export class Metronome {
  opts: MetronomeOptions;
  onTick?: (t: Tick) => void;
  onBar?: (bar: number) => void;

  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private pos: Tick = { bar: 0, beat: 0, sub: 0 };
  private uiTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(opts: MetronomeOptions) {
    this.opts = { ...opts };
  }

  get running(): boolean {
    return this.timer !== null;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.ctx = await getAudioContext();
    this.pos = { bar: 0, beat: 0, sub: 0 };
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.uiTimers.forEach(clearTimeout);
    this.uiTimers.clear();
  }

  set(patch: Partial<MetronomeOptions>): void {
    this.opts = { ...this.opts, ...patch };
    if (patch.bpm !== undefined) this.opts.bpm = clampBpm(patch.bpm);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const tick = { ...this.pos };
      this.click(ctx, this.nextTime, tick);

      const delay = Math.max(0, (this.nextTime - ctx.currentTime) * 1000);
      const id = setTimeout(() => {
        this.uiTimers.delete(id);
        this.onTick?.(tick);
        if (tick.beat === 0 && tick.sub === 0 && tick.bar > 0) {
          this.onBar?.(tick.bar);
        }
      }, delay);
      this.uiTimers.add(id);

      this.advance();
    }
  }

  private advance(): void {
    const { bpm, subdivision, beatsPerBar } = this.opts;
    this.nextTime += 60 / bpm / subdivision;
    const p = this.pos;
    p.sub++;
    if (p.sub >= subdivision) {
      p.sub = 0;
      p.beat++;
      if (p.beat >= beatsPerBar) {
        p.beat = 0;
        p.bar++;
      }
    }
  }

  private click(ctx: AudioContext, when: number, t: Tick): void {
    const down = t.beat === 0 && t.sub === 0 && this.opts.accent;
    const onBeat = t.sub === 0;
    const freq = down ? 1600 : onBeat ? 1100 : 750;
    const vol = down ? 0.5 : onBeat ? 0.32 : 0.16;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.05);
  }
}

/** Average BPM from tap timestamps (ms). Ignores taps older than 3s. */
export function bpmFromTaps(taps: number[], now: number): number | null {
  const recent = taps.filter((t) => now - t < 3000);
  if (recent.length < 2) return null;
  const gaps = recent.slice(1).map((t, i) => t - recent[i]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return clampBpm(60000 / avg);
}
