"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BEAT_CYCLE,
  bpmFromTaps,
  Metronome,
  type MetronomeOptions,
  type Tick,
} from "./metronome";

export interface Trainer {
  on: boolean;
  step: number; // BPM added each time
  everyBars: number;
  maxBpm: number;
}

export function useMetronome(initial?: Partial<MetronomeOptions>) {
  const [opts, setOpts] = useState<MetronomeOptions>({
    bpm: 80,
    beatsPerBar: 4,
    subdivision: 1,
    beats: ["accent", "normal", "normal", "normal"],
    voice: "click",
    ...initial,
  });
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState<Tick | null>(null);
  const [trainer, setTrainer] = useState<Trainer>({
    on: false,
    step: 4,
    everyBars: 4,
    maxBpm: 140,
  });
  const m = useRef<Metronome | null>(null);
  const trainerRef = useRef(trainer);
  trainerRef.current = trainer;
  const taps = useRef<number[]>([]);

  if (!m.current) m.current = new Metronome(opts);

  useEffect(() => {
    const met = m.current!;
    met.onTick = setTick;
    met.onBar = (bar) => {
      const t = trainerRef.current;
      if (t.on && bar % t.everyBars === 0 && met.opts.bpm < t.maxBpm) {
        const bpm = Math.min(t.maxBpm, met.opts.bpm + t.step);
        met.set({ bpm });
        setOpts((o) => ({ ...o, bpm }));
      }
    };
    return () => met.stop();
  }, []);

  const update = useCallback((patch: Partial<MetronomeOptions>) => {
    m.current!.set(patch);
    setOpts({ ...m.current!.opts });
  }, []);

  /** Tap a beat: accent, normal, soft, off, and around again. Plays the new sound. */
  const cycleBeat = useCallback((i: number) => {
    const beats = [...m.current!.opts.beats];
    const next = BEAT_CYCLE[(BEAT_CYCLE.indexOf(beats[i]) + 1) % BEAT_CYCLE.length];
    beats[i] = next;
    m.current!.set({ beats });
    setOpts({ ...m.current!.opts });
    if (!m.current!.running) void m.current!.preview(next);
  }, []);

  const start = useCallback(async () => {
    await m.current!.start();
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    m.current!.stop();
    setRunning(false);
    setTick(null);
  }, []);

  const toggle = useCallback(
    () => (m.current!.running ? stop() : start()),
    [start, stop],
  );

  const tap = useCallback(() => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    const bpm = bpmFromTaps(taps.current, now);
    if (bpm) update({ bpm });
  }, [update]);

  const previewVoice = useCallback((voice: MetronomeOptions["voice"]) => {
    void m.current!.preview("accent", voice);
  }, []);

  return { opts, update, cycleBeat, previewVoice, running, start, stop, toggle, tick, tap, trainer, setTrainer };
}

export type MetronomeApi = ReturnType<typeof useMetronome>;
