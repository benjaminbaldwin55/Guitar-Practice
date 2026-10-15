"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Chroma } from "../music/chroma";
import { Calibrator, ChangeDetector, levelOf, type CalibrationState } from "./change-detector";
import { getAudioContext } from "./context";
import { encodeWav, joinChunks } from "./wav";

export type MicStatus = "off" | "starting" | "on" | "blocked";
type Mode = "idle" | "floor" | "calibrate" | "count";

const FRAME = 8192;
const HOP_MS = 50;
const CALIBRATE_TIMEOUT_MS = 12000;
const MAX_RECORD_S = 120;

/** Calibrations survive for the life of the page, so "go again" skips it. */
const calibrationCache = new Map<string, [Chroma[], Chroma[]]>();

export interface TimelinePoint {
  t: number; // ms since counting started
  label: 0 | 1 | null;
  counted: boolean;
}

/**
 * Mic + ChangeDetector. Knows the two chords you're switching between and
 * counts real switches. Exposes what it hears right now for the UI, and
 * keeps a recording of the take so it can be saved and checked later.
 */
export function useChangeCounter(pair: [string, string]) {
  const key = pair.join("-");
  const [mic, setMic] = useState<MicStatus>("off");
  const [count, setCount] = useState(0);
  const [hearing, setHearing] = useState<0 | 1 | null>(null);
  const [level, setLevel] = useState(0);
  const [gate, setGate] = useState(0);
  const [sims, setSims] = useState<[number, number] | null>(null);
  const [calState, setCalState] = useState<CalibrationState | null>(null);
  const det = useRef(new ChangeDetector(pair));
  const mode = useRef<Mode>("idle");
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tap = useRef<ScriptProcessorNode | null>(null);
  const sampleRate = useRef(48000);
  const calib = useRef<{ cal: Calibrator; started: number; done: (ok: boolean) => void } | null>(null);
  const calibrated = useRef<[boolean, boolean]>([false, false]);
  const rec = useRef<{ on: boolean; chunks: Float32Array[]; samples: number }>({ on: false, chunks: [], samples: 0 });
  const timeline = useRef<TimelinePoint[]>([]);
  const countStart = useRef(0);

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
      // Count-in: keep learning the room, but only from quiet moments.
      const l = levelOf(frame);
      if (d.roomFrames < 6 || l < d.gate) d.hearRoom(l);
      setLevel(l);
      setGate(d.gate);
      return;
    }
    if (m === "calibrate" && calib.current) {
      const c = calib.current;
      const state = c.cal.push(frame, sr);
      setCalState(state);
      setLevel(levelOf(frame));
      setGate(Math.max(d.opts.minLevel * 2, d.noise * 5));
      if (state === "done") c.done(true);
      else if (performance.now() - c.started > CALIBRATE_TIMEOUT_MS) c.done(false);
      return;
    }
    if (m === "count") {
      const now = performance.now();
      const r = d.push(frame, sr, now);
      setLevel(r.level);
      setGate(d.gate);
      setSims(r.sims);
      setHearing(r.label);
      timeline.current.push({ t: now - countStart.current, label: r.label, counted: r.counted });
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
      sampleRate.current = ctx.sampleRate;
      const source = ctx.createMediaStreamSource(media);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FRAME;
      source.connect(analyser);
      // A plain tap that copies raw samples while we're recording a take.
      const sp = ctx.createScriptProcessor(4096, 1, 1);
      sp.onaudioprocess = (e) => {
        const r = rec.current;
        if (!r.on || r.samples > MAX_RECORD_S * ctx.sampleRate) return;
        const x = new Float32Array(e.inputBuffer.getChannelData(0));
        r.chunks.push(x);
        r.samples += x.length;
      };
      source.connect(sp);
      sp.connect(ctx.destination); // outputs silence; needed so it runs
      tap.current = sp;
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
    tap.current?.disconnect();
    tap.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    mode.current = "idle";
    rec.current.on = false;
    setMic("off");
  }, []);

  /** Start a fresh recording of this take (calibration strums included). */
  const startRecording = useCallback(() => {
    rec.current = { on: true, chunks: [], samples: 0 };
  }, []);

  /** The take so far as a WAV, for "save this take". */
  const takeWav = useCallback((): Blob | null => {
    const r = rec.current;
    if (!r.samples) return null;
    return encodeWav(joinChunks(r.chunks), sampleRate.current);
  }, []);

  /**
   * Listen for one strum of one chord and learn its sound. Listens to the
   * room first, waits for the strum, then keeps half a second of it
   * ringing. Resolves false if no strum arrives in time.
   */
  const calibrate = useCallback(
    (side: 0 | 1) =>
      new Promise<boolean>((resolve) => {
        mode.current = "calibrate";
        const cal = new Calibrator(det.current);
        setCalState(cal.state);
        calib.current = {
          cal,
          started: performance.now(),
          done: (ok) => {
            const frames = cal.frames;
            calib.current = null;
            mode.current = "floor";
            setCalState(null);
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
    const old = det.current;
    det.current = new ChangeDetector(pair);
    // Keep what we know about the room.
    if (old.roomFrames) for (let i = 0; i < 6; i++) det.current.hearRoom(old.noise);
    calibrated.current = [false, false];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Count-in: keep listening so the room level stays current. */
  const listenForFloor = useCallback(() => {
    mode.current = "floor";
  }, []);

  const begin = useCallback(() => {
    det.current.restartCount();
    setCount(0);
    setHearing(null);
    timeline.current = [];
    countStart.current = performance.now();
    mode.current = "count";
  }, []);

  const end = useCallback(() => {
    mode.current = "idle";
    rec.current.on = false;
    setHearing(null);
    setSims(null);
  }, []);

  useEffect(() => closeMic, [closeMic]);

  return {
    mic,
    count,
    setCount,
    hearing,
    level,
    gate,
    sims,
    calState,
    timeline: () => timeline.current,
    isCalibrated: () => calibrated.current[0] && calibrated.current[1],
    openMic,
    closeMic,
    calibrate,
    forgetCalibration,
    listenForFloor,
    startRecording,
    takeWav,
    begin,
    end,
  };
}
