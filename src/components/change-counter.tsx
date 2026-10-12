"use client";

import { useEffect, useRef, useState } from "react";
import { CHORD_PAIRS, nextMilestone, pairId, unlockedCount, UNLOCK_AT } from "@/content/chord-path";
import { beep } from "@/lib/audio/beep";
import { useChangeCounter } from "@/lib/audio/use-change-counter";
import { PLAYERS } from "@/lib/players";
import type { PlayerId } from "@/lib/types";
import type { Bests } from "@/lib/use-measurements";
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
}: {
  pair: [string, string];
  players: PlayerId[];
  bests: Bests;
  onSave: (r: ChangeResult) => Promise<void> | void;
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
          <p className="display text-4xl" style={{ color }}>
            Strum {pair[calSide]} once
          </p>
          <p className="mt-3 text-ink-dim">
            Let it ring for a second. This teaches the app how your guitar sounds.
          </p>
          {calMissed && <p className="mt-2 text-live">Didn&apos;t catch the last one. Using the standard sound for it.</p>}
          <MicMeter level={counter.level} />
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
          <div className="mx-auto mt-4 h-4 max-w-xl overflow-hidden rounded-(--r) border-(length:--bw) border-ink">
            <div className="h-full bg-ink transition-[width] duration-200" style={{ width: `${(left / SECONDS) * 100}%` }} />
          </div>
          <p className="num mt-2 text-lg font-semibold">{left}s</p>
          {counter.mic === "on" && <MicMeter level={counter.level} />}
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
          <div className="mt-6 flex justify-center gap-3">
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

function MicMeter({ level }: { level: number }) {
  const pct = Math.min(100, Math.sqrt(level) * 220);
  return (
    <div className="mx-auto mt-4 flex max-w-xs items-center gap-2 text-xs text-ink-dim">
      <span>Mic</span>
      <div className="h-2 flex-1 rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
