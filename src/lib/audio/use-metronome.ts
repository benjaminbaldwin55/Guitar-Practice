"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bpmFromTaps,
  clampBpm,
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
    accent: true,
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
    const p = { ...patch };
    if (p.bpm !== undefined) p.bpm = clampBpm(p.bpm);
    m.current!.set(p);
    setOpts((o) => ({ ...o, ...p }));
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

  return { opts, update, running, start, stop, toggle, tick, tap, trainer, setTrainer };
}

export type MetronomeApi = ReturnType<typeof useMetronome>;
