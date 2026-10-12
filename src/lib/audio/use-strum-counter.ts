"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext } from "./context";
import { OnsetDetector, rmsOf } from "./onsets";

export type MicStatus = "off" | "starting" | "on" | "blocked";

/** Counts strums heard through the mic while `listening` is on. */
export function useStrumCounter() {
  const [mic, setMic] = useState<MicStatus>("off");
  const [count, setCount] = useState(0);
  const [level, setLevel] = useState(0);
  const listening = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const detector = useRef(new OnsetDetector());

  const openMic = useCallback(async (): Promise<boolean> => {
    if (stream.current) return true;
    setMic("starting");
    try {
      const ctx = await getAudioContext();
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      stream.current = media;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(media).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let n = 0;
      timer.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        const rms = rmsOf(buf);
        if (++n % 6 === 0) setLevel(rms); // the meter doesn't need 100 updates a second
        if (listening.current && detector.current.push(rms, performance.now())) {
          setCount((c) => c + 1);
        }
      }, 10);
      setMic("on");
      return true;
    } catch {
      setMic("blocked");
      return false;
    }
  }, []);

  const closeMic = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    listening.current = false;
    setMic("off");
  }, []);

  const begin = useCallback(() => {
    detector.current.reset();
    setCount(0);
    listening.current = true;
  }, []);

  const end = useCallback(() => {
    listening.current = false;
  }, []);

  useEffect(() => closeMic, [closeMic]);

  return { mic, count, setCount, level, openMic, closeMic, begin, end };
}
