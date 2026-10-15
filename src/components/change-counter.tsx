"use client";

import { useEffect, useRef, useState } from "react";
import { CHORD_PAIRS, nextMilestone, pairId, unlockedCount, UNLOCK_AT } from "@/content/chord-path";
import { beep } from "@/lib/audio/beep";
import { useChangeCounter } from "@/lib/audio/use-change-counter";
import { PLAYERS } from "@/lib/players";
import type { PlayerId } from "@/lib/types";
import type { Bests } from "@/lib/use-measurements";
import { CandyBar } from "./candy-bar";
import { ChordDiagram } from "./chord-diagram";
import { Button } from "./ui";

const SECONDS = 60;

type Phase = "ready" | "calibrate" | "countdown" | "running" | "review" | "saved";

export interface ChangeResult {
  player: PlayerId;
  value: number;
  previousBest: number | null;
  unlocked: [string, string] | null;
}

/**
 * One-minute chord changes. The app learns how your two chords sound (one
 * strum each), then counts only real switches from one to the other.
 * In a together session you take turns.
 */
export function ChangeCounter({
  pair,
  players,
  bests,
  onSave,
  onTryPair,
}: {
  pair: [string, string];
  players: PlayerId[];
  bests: Bests;
  onSave: (r: ChangeResult) => Promise<void> | void;
  /** Jump straight to a pair you just unlocked. */
  onTryPair?: (pair: [string, string]) => void;
}) {
  const id = pairId(pair);
  const counter = useChangeCounter(pair);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [calSide, setCalSide] = useState<0 | 1>(0);
  const [calMissed, setCalMissed] = useState(false);
  const [left, setLeft] = useState(SECONDS);
  const [count3, setCount3] = useState(3);
  const [result, setResult] = useState<ChangeResult | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  const player = players[turn];
  const color = `var(--${player})`;
  const best = bests[player]?.[id] ?? null;
  const goal = nextMilestone(best);

  useEffect(
    () => () => {
      cancelled.current = true;
      if (tick.current) clearInterval(tick.current);
    },
    [],
  );

  async function start(recalibrate = false) {
    const ok = await counter.openMic();
    if (!ok) return countdown(); // no mic: count in your head
    counter.startRecording();
    if (recalibrate) counter.forgetCalibration();
    if (recalibrate || !counter.isCalibrated()) {
      setPhase("calibrate");
      for (const side of [0, 1] as const) {
        setCalSide(side);
        setCalMissed(false);
        const heard = await counter.calibrate(side);
        if (cancelled.current) return;
        if (heard) beep(1320, 90);
        else setCalMissed(true);
      }
    }
    countdown();
  }

  function countdown() {
    counter.listenForFloor();
    setPhase("countdown");
    setCount3(3);
    let n = 3;
    beep(660);
    tick.current = setInterval(() => {
      n--;
      if (n > 0) {
        setCount3(n);
        beep(660);
        return;
      }
      clearInterval(tick.current!);
      beep(1320, 200);
      run();
    }, 1000);
  }

  function run() {
    counter.begin();
    setPhase("running");
    const started = performance.now();
    setLeft(SECONDS);
    tick.current = setInterval(() => {
      const remaining = SECONDS - Math.floor((performance.now() - started) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) finish();
    }, 200);
  }

  function finish() {
    if (tick.current) clearInterval(tick.current);
    counter.end();
    beep(440, 400);
    setPhase("review");
  }

  async function save() {
    const value = counter.count;
    const before = unlockedCount(bests[player] ?? {});
    const after = unlockedCount({ ...(bests[player] ?? {}), [id]: Math.max(value, best ?? 0) });
    const r: ChangeResult = {
      player,
      value,
      previousBest: best,
      unlocked: after > before ? CHORD_PAIRS[after - 1] : null,
    };
    await onSave(r);
    setResult(r);
    setPhase("saved");
  }

  function downloadTake() {
    const wav = counter.takeWav();
    if (!wav) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(wav);
    a.download = `changes-${id}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.wav`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function next() {
    setTurn((t) => t + 1);
    setResult(null);
    counter.setCount(0);
    setPhase("ready");
  }

  const big = "display num text-[clamp(6rem,18vw,12rem)]";
  const live = phase === "running" && counter.mic === "on";
  // Which chord box to light up: the one it hears while counting, or the one to strum while calibrating.
  const lit = phase === "calibrate" ? calSide : live ? counter.hearing : null;

  return (
    <div>
      <div className="flex items-center justify-center gap-4 md:gap-12">
        {pair.map((c, i) => (
          <div key={c} className="contents">
            {i === 1 && (
              <span className="display text-4xl md:text-5xl" aria-hidden>
                ⇄
              </span>
            )}
            <div
              className={`rounded-[min(var(--r),20px)] border-(length:--bw) px-3 pt-2 pb-1 transition-colors duration-100 ${
                lit === i ? "flip-ink border-ink" : "border-transparent"
              }`}
            >
              <ChordDiagram id={c} size={phase === "running" ? 110 : 130} />
            </div>
          </div>
        ))}
      </div>

      {players.length > 1 && (
        <p className="mt-6 text-center text-lg font-bold" style={{ color }}>
          {PLAYERS[player].name}&apos;s turn
        </p>
      )}

      {phase === "ready" && (
        <div className="mt-6 text-center">
          <p className="mx-auto max-w-prose text-ink-dim">
            Practice the switch slowly a few times. Then for one minute, switch
            back and forth and strum each chord as you land it. The app listens
            for which chord is ringing, so only real switches count.
          </p>
          <p className="mt-4 text-lg">
            {best ? (
              <>
                Your best: <b className="num">{best}</b>
                {goal && (
                  <>
                    . Next goal: <b className="num">{goal}</b>
                  </>
                )}
              </>
            ) : (
              <>First time on this one. Anything counts.</>
            )}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" onClick={() => start()} disabled={counter.mic === "starting"}>
              Start the minute
            </Button>
            {counter.isCalibrated() && (
              <Button size="lg" variant="ghost" onClick={() => start(true)}>
                Re-learn my chords
              </Button>
            )}
          </div>
          {counter.mic === "blocked" && (
            <p className="mt-4 text-live">No mic, so count in your head. You&apos;ll enter the number at the end.</p>
          )}
        </div>
      )}

      {phase === "calibrate" && (
        <div className="mt-8 text-center">
          {counter.calState === "listening-to-room" ? (
            <p className="display text-4xl text-ink-dim">Hold still a sec</p>
          ) : counter.calState === "ringing" ? (
            <p className="display text-4xl text-good">Got it, let it ring</p>
          ) : (
            <p className="display text-4xl" style={{ color }}>
              Strum {pair[calSide]} once
            </p>
          )}
          <p className="mt-3 text-ink-dim">
            {counter.calState === "listening-to-room"
              ? "Listening to the room so it knows what quiet sounds like."
              : "One full strum, then let it ring. This teaches the app how your guitar sounds."}
          </p>
          {calMissed && <p className="mt-2 text-live">Didn&apos;t catch the last one. Using the standard sound for it.</p>}
          <MicMeter level={counter.level} gate={counter.gate} />
        </div>
      )}

      {phase === "countdown" && (
        <div className="mt-8 text-center">
          <div className={big} style={{ color }}>
            {count3}
          </div>
          <p className="mt-2 text-ink-dim">Fingers on {pair[0]}</p>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-6 text-center">
          <div className={big} style={{ color }}>
            {counter.mic === "on" ? counter.count : "?"}
          </div>
          <CandyBar value={left} max={SECONDS} color={color} size="lg" className="mx-auto mt-4 max-w-xl" label="Time left" />
          <p className="num mt-2 text-lg font-semibold">{left}s</p>
          {counter.mic === "on" && (
            <>
              <MicMeter level={counter.level} gate={counter.gate} />
              <Hears pair={pair} sims={counter.sims} hearing={counter.hearing} color={color} />
            </>
          )}
          <Button className="mt-4" variant="ghost" onClick={finish}>
            Stop early
          </Button>
        </div>
      )}

      {phase === "review" && (
        <div className="mt-6 text-center">
          <p className="text-ink-dim">
            {counter.mic === "on" ? "Here's what it heard. Fix it if it's off." : "How many did you count?"}
          </p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => counter.setCount((c) => Math.max(0, c - 1))} aria-label="One fewer">
              −
            </Button>
            <div className={big} style={{ color }}>
              {counter.count}
            </div>
            <Button size="lg" onClick={() => counter.setCount((c) => c + 1)} aria-label="One more">
              +
            </Button>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" size="lg" onClick={save}>
              Save {counter.count}
            </Button>
            <Button size="lg" onClick={() => setPhase("ready")}>
              Redo
            </Button>
          </div>
          {counter.mic === "on" && (
            <div className="mx-auto mt-8 max-w-xl text-left">
              <Timeline pair={pair} points={counter.timeline()} color={color} />
              <p className="mt-3 text-sm text-ink-dim">
                Count way off? Save the recording so the counter can be tuned to your guitar.{" "}
                <button className="font-bold text-ink underline underline-offset-2" onClick={downloadTake}>
                  Save recording
                </button>
              </p>
            </div>
          )}
        </div>
      )}

      {phase === "saved" && result && (
        <div className="mt-6 text-center">
          {result.previousBest === null || result.value > result.previousBest ? (
            <p className="display text-4xl text-good">New best: {result.value}</p>
          ) : (
            <p className="text-2xl font-bold">
              {result.value}. Best is still {result.previousBest}.
            </p>
          )}
          {result.previousBest !== null && result.value > result.previousBest && (
            <p className="mt-2 text-ink-dim">Up {result.value - result.previousBest} from your last best.</p>
          )}
          {result.unlocked && (
            <p className="mt-4 text-2xl font-black">
              Unlocked: {result.unlocked[0]} ⇄ {result.unlocked[1]}
            </p>
          )}
          {!result.unlocked && result.value < UNLOCK_AT && (
            <p className="mt-2 text-ink-dim">
              {UNLOCK_AT - result.value} more to unlock the next chord change.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {result.unlocked && onTryPair && turn >= players.length - 1 && (
              <Button variant="primary" size="lg" onClick={() => onTryPair(result.unlocked!)}>
                Try {result.unlocked[0]} ⇄ {result.unlocked[1]} now
              </Button>
            )}
            {turn < players.length - 1 ? (
              <Button variant="primary" size="lg" onClick={next}>
                {PLAYERS[players[turn + 1]].name}&apos;s turn
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => {
                  counter.setCount(0);
                  setPhase("ready");
                }}
              >
                Go again
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const meterPct = (level: number) => Math.min(100, Math.sqrt(level) * 220);

/** Mic level, with a notch where it starts counting as guitar instead of room. */
function MicMeter({ level, gate }: { level: number; gate?: number }) {
  const over = gate !== undefined && level > gate;
  return (
    <div className="mx-auto mt-4 flex max-w-xs items-center gap-2 text-xs text-ink-dim">
      <span>Mic</span>
      <div className="relative h-2 flex-1 rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full ${over ? "bg-good" : "bg-ink-faint"}`}
          style={{ width: `${meterPct(level)}%` }}
        />
        {gate !== undefined && gate > 0 && (
          <div className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${meterPct(gate)}%` }} title="Guitar starts here" />
        )}
      </div>
    </div>
  );
}

/**
 * Live: which way the sound leans. Raw match scores for two chords are
 * always close, so this shows the difference: a dot that slides toward the
 * chord it hears and lights up once it's sure.
 */
function Hears({
  pair,
  sims,
  hearing,
  color,
}: {
  pair: [string, string];
  sims: [number, number] | null;
  hearing: 0 | 1 | null;
  color: string;
}) {
  const lean = sims ? Math.max(-1, Math.min(1, (sims[1] - sims[0]) / 0.12)) : 0;
  return (
    <div className="mx-auto mt-3 flex max-w-xs items-center gap-2 text-xs text-ink-dim">
      <span className={`w-8 text-right font-bold ${hearing === 0 ? "text-ink" : ""}`}>{pair[0]}</span>
      <div className="relative h-2 flex-1 rounded-full bg-surface-2">
        <div className="absolute top-0 left-1/2 h-2 w-px bg-ink-faint" />
        <div
          className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-ink transition-[left] duration-75"
          style={{
            left: `${50 + lean * 50}%`,
            background: hearing === null ? "var(--surface-2)" : color,
            opacity: sims ? 1 : 0.3,
          }}
        />
      </div>
      <span className={`w-8 font-bold ${hearing === 1 ? "text-ink" : ""}`}>{pair[1]}</span>
    </div>
  );
}

/** What it heard over the minute: which chord, and where it counted a change. */
function Timeline({
  pair,
  points,
  color,
}: {
  pair: [string, string];
  points: { t: number; label: 0 | 1 | null; counted: boolean }[];
  color: string;
}) {
  if (!points.length) return null;
  const end = Math.max(1000, points.at(-1)!.t);
  const fill = (l: 0 | 1 | null) => (l === 0 ? color : l === 1 ? "var(--ink)" : "transparent");
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-dim">
        <span>What it heard</span>
        <span className="flex gap-3">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: color }} />{pair[0]}</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-ink" />{pair[1]}</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-good" />counted</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${end} 30`} preserveAspectRatio="none" className="mt-1 h-8 w-full rounded-md bg-surface-2">
        {points.map((p, i) => {
          const w = (points[i + 1]?.t ?? p.t + 50) - p.t;
          return p.label === null ? null : <rect key={i} x={p.t} y={4} width={w + 1} height={18} fill={fill(p.label)} />;
        })}
        {points
          .filter((p) => p.counted)
          .map((p, i) => (
            <rect key={`c${i}`} x={p.t - end / 600} y={24} width={end / 300} height={6} fill="var(--good)" />
          ))}
      </svg>
    </div>
  );
}
