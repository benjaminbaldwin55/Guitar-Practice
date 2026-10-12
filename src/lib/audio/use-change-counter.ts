"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chromaOf, type Chroma } from "../music/chroma";
import { ChangeDetector } from "./change-detector";
import { getAudioContext } from "./context";

export type MicStatus = "off" | "starting" | "on" | "blocked";
type Mode = "idle" | "floor" | "calibrate" | "count";

const FRAME = 8192;
const HOP_MS = 50;

/** Calibrations survive for the life of the page, so "go again" skips it. */
const calibrationCache = new Map<string, [Chroma[], Chroma[]]>();

/**
 * Mic + ChangeDetector. Knows the two chords you're switching between and
 * counts real switches. Exposes which chord it hears right now for the UI.
 */
export function useChangeCounter(pair: [string, string]) {
  const key = pair.join("-");
  const [mic, setMic] = useState<MicStatus>("off");
  const [count, setCount] = useState(0);
  const [hearing, setHearing] = useState<0 | 1 | null>(null);
  const [level, setLevel] = useState(0);
  const det = useRef(new ChangeDetector(pair));
  const mode = useRef<Mode>("idle");
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const calib = useRef<{ frames: Chroma[]; armed: boolean; done: (ok: boolean) => void; started: number } | null>(null);
  const calibrated = useRef<[boolean, boolean]>([false, false]);

  // New pair: new detector, and reuse a calibration from earlier if we have one.
  useEffect(() => {
    det.current = new ChangeDetector(pair);
    calibrated.current = [false, false];
    const cached = calibrationCache.get(key);
    if (cached) {
      det.current.calibrate(0, cached[0]);
      det.current.calibrate(1, cached[1]);
      calibrated.current = [true, true];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const onFrame = useCallback((frame: Float32Array, sr: number) => {
    const d = det.current;
    const m = mode.current;
    if (m === "floor") {
      setLevel(d.audible(frame).level);
      return;
    }
    if (m === "calibrate" && calib.current) {
      const c = calib.current;
      const { ok, level } = d.audible(frame);
      setLevel(level);
      if (!c.armed && ok) c.armed = true; // the strum arrived
      if (c.armed && ok) c.frames.push(chromaOf(frame, sr));
      if (c.frames.length >= 10) c.done(true); // about half a second of ringing
      else if (performance.now() - c.started > 10000) c.done(false);
      return;
    }
    if (m === "count") {
      const r = d.push(frame, sr, performance.now());
      setLevel(r.level);
      setHearing(r.label);
      if (r.counted) setCount(d.count);
    }
  }, []);

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
      analyser.fftSize = FRAME;
      ctx.createMediaStreamSource(media).connect(analyser);
      const buf = new Float32Array(FRAME);
      timer.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        onFrame(buf, ctx.sampleRate);
      }, HOP_MS);
      setMic("on");
      return true;
    } catch {
      setMic("blocked");
      return false;
    }
  }, [onFrame]);

  const closeMic = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    mode.current = "idle";
    setMic("off");
  }, []);

  /** Listen for one strum of one chord and learn its sound. Resolves false on timeout. */
  const calibrate = useCallback(
    (side: 0 | 1) =>
      new Promise<boolean>((resolve) => {
        det.current.reset(); // fresh noise floor
        mode.current = "calibrate";
        calib.current = {
          frames: [],
          armed: false,
          started: performance.now(),
          done: (ok) => {
            const frames = calib.current?.frames ?? [];
            calib.current = null;
            mode.current = "floor";
            if (ok) {
              det.current.calibrate(side, frames);
              calibrated.current[side] = true;
              const cached = calibrationCache.get(key) ?? [[], []];
              cached[side] = frames;
              calibrationCache.set(key, cached);
            }
            resolve(ok);
          },
        };
      }),
    [key],
  );

  const forgetCalibration = useCallback(() => {
    calibrationCache.delete(key);
    det.current = new ChangeDetector(pair);
    calibrated.current = [false, false];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Count-in: keep listening so the noise floor stays current. */
  const listenForFloor = useCallback(() => {
    mode.current = "floor";
  }, []);

  const begin = useCallback(() => {
    // Keep the floor learned during the count-in; just zero the count.
    det.current.restartCount();
    setCount(0);
    setHearing(null);
    mode.current = "count";
  }, []);

  const end = useCallback(() => {
    mode.current = "idle";
    setHearing(null);
  }, []);

  useEffect(() => closeMic, [closeMic]);

  return {
    mic,
    count,
    setCount,
    hearing,
    level,
    isCalibrated: () => calibrated.current[0] && calibrated.current[1],
    openMic,
    closeMic,
    calibrate,
    forgetCalibration,
    listenForFloor,
    begin,
    end,
  };
}
