"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext } from "./context";
import { centsOff, detectPitch, freqToMidi, PitchSmoother } from "../music/pitch";

export interface TunerReading {
  freq: number;
  midi: number;
  cents: number;
}

export type TunerStatus = "off" | "starting" | "listening" | "blocked";

/** Mic pitch reader. Smooths readings and holds the last note briefly. */
export function useTuner() {
  const [status, setStatus] = useState<TunerStatus>("off");
  const [reading, setReading] = useState<TunerReading | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const smoother = useRef(new PitchSmoother());
  const lastSeen = useRef(0);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    smoother.current.reset();
    setReading(null);
    setStatus("off");
  }, []);

  const start = useCallback(async () => {
    setStatus("starting");
    try {
      const ctx = await getAudioContext();
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      stream.current = media;
      const src = ctx.createMediaStreamSource(media);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 55;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      src.connect(hp).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);

      setStatus("listening");
      timer.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        const f = detectPitch(buf, ctx.sampleRate);
        const shown = smoother.current.push(f > 60 && f < 1400 ? f : -1);
        const now = performance.now();
        if (shown !== null) {
          const midi = freqToMidi(shown);
          lastSeen.current = now;
          setReading({ freq: shown, midi, cents: centsOff(shown, midi) });
        } else if (now - lastSeen.current > 1200) {
          setReading(null);
        }
      }, 50);
    } catch {
      setStatus("blocked");
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { status, reading, start, stop };
}
