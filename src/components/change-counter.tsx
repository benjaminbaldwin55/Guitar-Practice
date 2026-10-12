"use client";

import { useEffect, useRef, useState } from "react";
import { CHORD_PAIRS, nextMilestone, pairId, unlockedCount, UNLOCK_AT } from "@/content/chord-path";
import { beep } from "@/lib/audio/beep";
import { useStrumCounter } from "@/lib/audio/use-strum-counter";
import { PLAYERS } from "@/lib/players";
import type { PlayerId } from "@/lib/types";
import type { Bests } from "@/lib/use-measurements";
import { ChordDiagram } from "./chord-diagram";
import { Button } from "./ui";

const SECONDS = 60;

type Phase = "ready" | "countdown" | "running" | "review" | "saved";

export interface ChangeResult {
  player: PlayerId;
  value: number;
  previousBest: number | null;
  unlocked: [string, string] | null;
}

/**
 * One-minute chord changes. Strum once each time you land the next chord;
 * the mic counts the strums. In a together session you take turns.
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
  const counter = useStrumCounter();
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [left, setLeft] = useState(SECONDS);
  const [count3, setCount3] = useState(3);
  const [result, setResult] = useState<ChangeResult | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const player = players[turn];
  const color = `var(--${player})`;
  const best = bests[player]?.[id] ?? null;
  const goal = nextMilestone(best);

  useEffect(() => () => {
    if (tick.current) clearInterval(tick.current);
  }, []);

  async function start() {
    await counter.openMic();
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
    // Did this score open a new pair?
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

  return (
    <div>
      <div className="flex items-center justify-center gap-4 md:gap-12">
        <ChordDiagram id={pair[0]} size={phase === "running" ? 110 : 130} />
        <span className="display text-4xl md:text-5xl" aria-hidden>
          ⇄
        </span>
        <ChordDiagram id={pair[1]} size={phase === "running" ? 110 : 130} />
      </div>

      {players.length > 1 && (
        <p className="mt-6 text-center text-lg font-bold" style={{ color }}>
          {PLAYERS[player].name}&apos;s turn
        </p>
      )}

      {phase === "ready" && (
        <div className="mt-6 text-center">
          <p className="mx-auto max-w-prose text-ink-dim">
            Practice the switch slowly a few times first. Then, for one minute,
            strum once every time you land the next chord. The mic counts the
            strums.
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
          <div className="mt-6">
            <Button variant="primary" size="lg" onClick={start} disabled={counter.mic === "starting"}>
              Start the minute
            </Button>
          </div>
          {counter.mic === "blocked" && (
            <p className="mt-4 text-live">
              No mic, so count in your head. You&apos;ll enter the number at the end.
            </p>
          )}
        </div>
      )}

      {phase === "countdown" && (
        <div className="mt-8 text-center">
          <div className={big} style={{ color }}>
            {count3}
          </div>
          <p className="mt-2 text-ink-dim">Get your fingers on {pair[0]}</p>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-6 text-center">
          <div className={big} style={{ color }} aria-live="off">
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
            {counter.mic === "on" ? "Heard this many changes. Fix it if it's off." : "How many did you count?"}
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
            <p className="mt-2 text-ink-dim">Up {result.value - result.previousBest} from last best.</p>
          )}
          {result.unlocked && (
            <p className="mt-4 text-xl font-bold">
              Unlocked: {result.unlocked[0]} to {result.unlocked[1]}
            </p>
          )}
          {!result.unlocked && result.value < UNLOCK_AT && (
            <p className="mt-2 text-ink-dim">
              Hit {UNLOCK_AT} to unlock the next chord change.
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            {turn < players.length - 1 ? (
              <Button variant="primary" size="lg" onClick={next}>
                {PLAYERS[players[turn + 1]].name}&apos;s turn
              </Button>
            ) : (
              <Button size="lg" onClick={() => { counter.setCount(0); setPhase("ready"); }}>
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
