import { getAudioContext } from "./context";

export type Subdivision = 1 | 2 | 3 | 4;

export interface Tick {
  bar: number;
  beat: number; // 0-based beat in the bar
  sub: number; // 0-based subdivision within the beat
}

/** How each beat in the bar sounds. Tap a beat in the UI to cycle these. */
export type BeatSound = "accent" | "normal" | "soft" | "off";
export const BEAT_CYCLE: BeatSound[] = ["accent", "normal", "soft", "off"];

export type Voice = "click" | "wood" | "hat" | "cowbell";

export interface MetronomeOptions {
  bpm: number;
  beatsPerBar: number;
  subdivision: Subdivision;
  /** One entry per beat. Its length always matches beatsPerBar. */
  beats: BeatSound[];
  voice: Voice;
}

/** Resize a beat pattern, keeping what's there and filling with plain beats. */
export function fitBeats(beats: BeatSound[], n: number): BeatSound[] {
  return Array.from({ length: n }, (_, i) => beats[i] ?? (i === 0 ? "accent" : "normal"));
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
    this.opts.beats = fitBeats(this.opts.beats, this.opts.beatsPerBar);
  }

  /** Play one beat right now, so you can hear a sound while choosing it. */
  async preview(sound: BeatSound, voice: Voice = this.opts.voice): Promise<void> {
    const ctx = await getAudioContext();
    playVoice(ctx, ctx.currentTime + 0.01, voice, sound, false);
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
    const sound = this.opts.beats[t.beat] ?? "normal";
    if (sound === "off") return;
    const sub = t.sub !== 0;
    playVoice(ctx, when, this.opts.voice, sub ? "soft" : sound, sub);
  }
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, b);
  }
  return b;
}

const VOL: Record<Exclude<BeatSound, "off">, number> = { accent: 0.55, normal: 0.32, soft: 0.14 };

/** Synthesized click voices. All built from oscillators and noise, no samples. */
function playVoice(ctx: AudioContext, when: number, voice: Voice, sound: BeatSound, sub: boolean): void {
  if (sound === "off") return;
  const vol = VOL[sound] * (sub ? 0.7 : 1);
  const out = ctx.createGain();
  out.connect(ctx.destination);

  if (voice === "hat") {
    // Closed hi-hat; the accent opens it up a little.
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const len = sound === "accent" ? 0.14 : 0.045;
    out.gain.setValueAtTime(vol, when);
    out.gain.exponentialRampToValueAtTime(0.0001, when + len);
    src.connect(hp).connect(out);
    src.start(when);
    src.stop(when + len + 0.02);
    return;
  }

  if (voice === "cowbell") {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    bp.Q.value = 3;
    bp.connect(out);
    for (const f of [540, 800]) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = sound === "accent" ? f * 1.06 : f;
      o.connect(bp);
      o.start(when);
      o.stop(when + 0.16);
    }
    out.gain.setValueAtTime(vol * 1.4, when);
    out.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
    return;
  }

  const o = ctx.createOscillator();
  if (voice === "wood") {
    // Woodblock: a short sine with a quick pitch drop.
    const f = sound === "accent" ? 1300 : sound === "normal" ? 950 : 800;
    o.type = "sine";
    o.frequency.setValueAtTime(f * 1.3, when);
    o.frequency.exponentialRampToValueAtTime(f, when + 0.015);
    out.gain.setValueAtTime(vol * 1.5, when);
    out.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
  } else {
    const f = sound === "accent" ? 1600 : sound === "normal" ? 1100 : 800;
    o.type = "square";
    o.frequency.value = f;
    out.gain.setValueAtTime(vol, when);
    out.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
  }
  o.connect(out);
  o.start(when);
  o.stop(when + 0.08);
}

/** Average BPM from tap timestamps (ms). Ignores taps older than 3s. */
export function bpmFromTaps(taps: number[], now: number): number | null {
  const recent = taps.filter((t) => now - t < 3000);
  if (recent.length < 2) return null;
  const gaps = recent.slice(1).map((t, i) => t - recent[i]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return clampBpm(60000 / avg);
}
