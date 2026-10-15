"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { BlockView, blockLabel } from "@/components/block-view";
import type { ChangeResult } from "@/components/change-counter";
import { MetronomePanel } from "@/components/metronome-panel";
import { TunerPanel } from "@/components/tuner-panel";
import { Button, Chip, PageTitle } from "@/components/ui";
import { pairId } from "@/content/chord-path";
import { beep } from "@/lib/audio/beep";
import { formatClock, WallClock } from "@/lib/session/clock";
import { useMetronome } from "@/lib/audio/use-metronome";
import { newId } from "@/lib/ids";
import { PLAYERS, playersFor, whoLabel } from "@/lib/players";
import {
  buildSession,
  freePlay,
  funOptions,
  toSessionBlocks,
  type PlannedBlock,
  type SessionLength,
} from "@/lib/session/builder";
import { dayKey, daysThisWeek, practiceDays } from "@/lib/streaks";
import type { Energy, Feel, PracticeSession } from "@/lib/types";
import { bestsOf, lastTempos, useMeasurements } from "@/lib/use-measurements";
import { useSessions } from "@/lib/use-sessions";
import { goalFor, isQuiet } from "@/lib/goals";
import { Sticker } from "@/components/sticker";
import { evaluate, historyFor, newlyUnlocked, type AchievementState, type Owner } from "@/lib/achievements";
import { ownerColor } from "@/lib/use-achievements";

type Stage = "setup" | "run" | "finish" | "done";

const ENERGY: { v: Energy; label: string }[] = [
  { v: "low", label: "Low" },
  { v: "normal", label: "Normal" },
  { v: "high", label: "Fired up" },
];

const FEELS: { v: Feel; label: string }[] = [
  { v: "rough", label: "Rough" },
  { v: "ok", label: "OK" },
  { v: "good", label: "Good" },
  { v: "great", label: "Great" },
];

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PracticePage() {
  const { settings, store, dataChanged } = useApp();
  const sessions = useSessions();
  const { all: measurements, record } = useMeasurements();
  const who = settings.activeWho;
  const players = useMemo(() => (who ? playersFor(who) : []), [who]);
  const owners = useMemo<Owner[]>(() => (players.length > 1 ? [...players, "together"] : players), [players]);

  const [stage, setStage] = useState<Stage>("setup");
  const [minutes, setMinutes] = useState<SessionLength>(20);
  const [energy, setEnergy] = useState<Energy>("normal");
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [avoid, setAvoid] = useState<string[]>([]); // what Shuffle steers away from
  const [blocks, setBlocks] = useState<PlannedBlock[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0); // whole session, active seconds
  const [blockTimes, setBlockTimes] = useState<number[]>([]); // seconds spent in each block
  const [trails, setTrails] = useState<Record<number, number[]>>({}); // tempos nailed per block
  const [drawer, setDrawer] = useState<"none" | "tuner" | "metronome">("none");
  const [pain, setPain] = useState<boolean | null>(null);
  const [feel, setFeel] = useState<Feel | null>(null);
  const [newBests, setNewBests] = useState<string[]>([]);
  const [saved, setSaved] = useState<PracticeSession | null>(null);
  const sessionId = useRef(newId());
  const before = useRef<Partial<Record<Owner, AchievementState[]>>>({}); // achievements when the session started
  const startedAt = useRef<string>("");
  const metro = useMetronome();

  const changeBests = useMemo(() => bestsOf(measurements ?? [], "chord-changes"), [measurements]);
  const bpmBests = useMemo(() => bestsOf(measurements ?? [], "clean-bpm"), [measurements]);
  const tempos = useMemo(() => lastTempos(measurements ?? []), [measurements]);
  const funChoices = useMemo(() => funOptions(players, changeBests), [players, changeBests]);

  // Last time, did something hurt? Then suggest an easy, short one.
  const lastSession = useMemo(
    () =>
      [...(sessions ?? [])]
        .filter((s) => s.players.some((p) => players.includes(p)))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0],
    [sessions, players],
  );
  const hurtLastTime = !!lastSession?.pain;
  useEffect(() => {
    if (hurtLastTime) {
      setMinutes(10);
      setEnergy("low");
    }
  }, [hurtLastTime]);

  const recentRefs = useMemo(
    () =>
      [...(sessions ?? [])]
        .filter((s) => s.players.some((p) => players.includes(p)))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 6)
        .flatMap((s) => s.blocks.map((b) => b.ref).filter(Boolean) as string[]),
    [sessions, players],
  );

  const plan = useMemo(() => {
    if (!players.length || !measurements) return [];
    return buildSession({ players, minutes, energy, bests: changeBests, recentRefs, tempos, seed, avoid });
    // Rebuild only when the inputs that shape the plan change, not on every new tempo saved mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, minutes, energy, changeBests, recentRefs, seed, avoid, !!measurements]);

  // Session clock, measured from real time so a YouTube tab doesn't eat it.
  // Runs while practicing and not paused; time goes to the current block.
  useEffect(() => {
    if (stage !== "run" || paused) return;
    const clock = new WallClock();
    clock.start(Date.now());
    const add = (d: number) => {
      if (d <= 0) return;
      setElapsed((e) => e + d);
      setBlockTimes((bt) => bt.map((v, i) => (i === idx ? v + d : v)));
    };
    const t = setInterval(() => add(clock.tick(Date.now())), 1000);
    // Catch up the moment you come back to this tab.
    const onVisible = () => add(clock.tick(Date.now()));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      add(clock.stop(Date.now()));
    };
  }, [stage, paused, idx]);

  const block = blocks[idx];
  const blockElapsed = blockTimes[idx] ?? 0;
  const countUp = block?.payload.type === "free";
  const blockLeft = block ? block.plannedMin * 60 - blockElapsed : 0;
  // Beep once when a block's planned time runs out.
  const beeped = useRef(-1);
  useEffect(() => {
    if (stage === "run" && block && !countUp && blockLeft <= 0 && beeped.current !== idx) {
      beeped.current = idx;
      beep(1046, 350);
    }
  }, [blockLeft, block, stage, idx, countUp]);

  // Set the metronome up for each block.
  useEffect(() => {
    if (stage !== "run" || !block) return;
    metro.stop();
    const p = block.payload;
    // Coming back to a block? Pick up just above the last tempo you nailed.
    const lastNailed = trails[idx]?.at(-1);
    const bpm = (b: number) => (lastNailed ? lastNailed + 5 : b);
    if (p.type === "strum") metro.update({ bpm: bpm(p.bpm), subdivision: 2, beatsPerBar: 4 });
    if (p.type === "scale") metro.update({ bpm: bpm(p.bpm), subdivision: 1, beatsPerBar: 4 });
    if (p.type === "progression") metro.update({ bpm: bpm(p.bpm), subdivision: 2, beatsPerBar: 4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, stage]);

  function start(toRun: PlannedBlock[] = plan) {
    beeped.current = -1;
    setBlocks(toRun);
    setIdx(0);
    setElapsed(0);
    setBlockTimes(toRun.map(() => 0));
    setTrails({});
    setPaused(false);
    setNewBests([]);
    setPain(null);
    setFeel(null);
    sessionId.current = newId();
    startedAt.current = new Date().toISOString();
    before.current = {};
    for (const o of owners) before.current[o] = evaluate(o, historyFor(o, sessions ?? [], measurements ?? [], settings));
    setStage("run");
  }

  /**
   * Remember how a tempo drill went (where it started, fastest nailed), so
   * next time it starts halfway between. Skipped if you barely touched it.
   */
  function saveTempo(i: number) {
    const b = blocks[i];
    const p = b?.payload;
    if (!b?.ref || !p || !(p.type === "strum" || p.type === "scale" || p.type === "progression")) return;
    const trail = trails[i] ?? [];
    if (!trail.length && (blockTimes[i] ?? 0) < 60) return;
    for (const pl of players) {
      void record({
        id: `${sessionId.current}:tempo:${i}:${pl}`,
        playerId: pl,
        kind: "tempo",
        subject: b.ref,
        value: trail.length ? Math.max(...trail) : p.bpm,
        meta: { start: p.bpm },
        sessionId: sessionId.current,
      });
    }
  }

  function next() {
    saveTempo(idx);
    setBlocks((bs) => bs.map((b, i) => (i === idx ? { ...b, done: true } : b)));
    if (idx < blocks.length - 1) setIdx(idx + 1);
    else endSession(false);
  }

  function back() {
    saveTempo(idx);
    if (idx > 0) setIdx(idx - 1);
  }

  function endSession(save = true) {
    if (save) saveTempo(idx);
    metro.stop();
    setDrawer("none");
    setStage("finish");
  }

  const saveSession = useCallback(
    async () => {
      if (!store || !feel) return;
      const s: PracticeSession = {
        id: sessionId.current,
        players,
        startedAt: startedAt.current,
        endedAt: new Date().toISOString(),
        minutes: Math.max(1, Math.round(elapsed / 60)),
        feel,
        pain: pain === true,
        blocks: toSessionBlocks(blocks),
      };
      await store.putSession(s);
      setSaved(s);
      dataChanged();
      setStage("done");
    },
    [store, feel, players, elapsed, pain, blocks, dataChanged],
  );

  async function onChangeSaved(r: ChangeResult, pair: [string, string]) {
    await record({
      playerId: r.player,
      kind: "chord-changes",
      subject: pairId(pair),
      value: r.value,
      sessionId: sessionId.current,
    });
    if (r.previousBest === null || r.value > r.previousBest) {
      setNewBests((n) => [...n, `${PLAYERS[r.player].name}: ${pair[0]} to ${pair[1]}, ${r.value} changes`]);
    }
    if (r.unlocked) {
      setNewBests((n) => [...n, `Unlocked ${r.unlocked![0]} to ${r.unlocked![1]}`]);
    }
  }

  async function onNailed(bpm: number) {
    const subject = block.ref ?? "";
    setTrails((t) => ({ ...t, [idx]: [...(t[idx] ?? []), bpm] }));
    for (const p of players) {
      const prev = bpmBests[p][subject];
      await record({ playerId: p, kind: "clean-bpm", subject, value: bpm, sessionId: sessionId.current });
      if (prev === undefined || bpm > prev) {
        setNewBests((n) => [
          ...n.filter((x) => !x.startsWith(`${PLAYERS[p].name}: ${block.title} at`)),
          `${PLAYERS[p].name}: ${block.title} at ${bpm} BPM`,
        ]);
      }
    }
  }

  // ---------- No player picked ----------
  if (!who) {
    return (
      <div>
        <PageTitle>Practice</PageTitle>
        <p className="mt-6 text-lg">
          First, pick who&apos;s playing on the{" "}
          <Link href="/" className="font-bold underline underline-offset-4">
            home screen
          </Link>
          .
        </p>
      </div>
    );
  }

  // ---------- Setup ----------
  if (stage === "setup") {
    return (
      <div>
        <p className="text-lg font-bold" style={{ color: `var(--${who})` }}>
          {whoLabel(who)}
        </p>
        <PageTitle>Today&apos;s session</PageTitle>

        {hurtLastTime && (
          <p className="mt-6 max-w-prose rounded-(--r) border-(length:--bw) border-ink bg-surface p-4">
            Something hurt last time, so this one is short and easy. Stop if it
            hurts again.
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
          <div>
            <h2 className="font-semibold">How long?</h2>
            <div className="mt-3 flex gap-2">
              {([10, 20, 30] as const).map((m) => (
                <Chip key={m} on={minutes === m} onClick={() => setMinutes(m)}>
                  {m} min
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-semibold">Energy?</h2>
            <div className="mt-3 flex gap-2">
              {ENERGY.map((e) => (
                <Chip key={e.v} on={energy === e.v} onClick={() => setEnergy(e.v)}>
                  {e.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <ol className="mt-10 border-t-(length:--bw) border-line">
          {plan.map((b, i) => (
            <li key={i} className="flex items-baseline gap-4 border-b-(length:--bw) border-line py-4">
              <span className="w-28 shrink-0 text-sm text-ink-dim">{blockLabel(b)}</span>
              <span className="flex-1 text-xl font-bold" style={{ fontStretch: "110%" }}>
                {b.title}
              </span>
              <span className="num text-ink-dim">{b.plannedMin} min</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" size="lg" onClick={() => start()} disabled={!plan.length}>
            Let&apos;s play
          </Button>
          <Button
            size="lg"
            onClick={() => {
              // Steer away from this plan (and the one before it) so Shuffle really changes things.
              setAvoid((a) => [...plan.map((b) => b.ref!).filter(Boolean), ...a].slice(0, 16));
              setSeed((s) => s + 1);
            }}
          >
            Shuffle
          </Button>
          <Button size="lg" variant="ghost" onClick={() => start(freePlay())}>
            Free play instead
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Finish: how it felt, anything hurt, save ----------
  if (stage === "finish") {
    return (
      <div>
        <PageTitle>Nice.</PageTitle>
        <p className="mt-4 text-2xl">
          <span className="num font-bold">{Math.max(1, Math.round(elapsed / 60))}</span> minutes
          {players.length > 1 ? " together" : ""}.
        </p>

        <h2 className="mt-10 text-xl font-semibold">How did it feel?</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {FEELS.map((f) => (
            <Chip key={f.v} on={feel === f.v} onClick={() => setFeel(f.v)} className="px-6 py-3 text-lg">
              {f.label}
            </Chip>
          ))}
        </div>

        <h2 className="mt-8 text-xl font-semibold">Anything hurt?</h2>
        <p className="mt-1 text-sm text-ink-dim">Wrist, fingers, anything. If yes, next time starts short and easy.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Chip on={pain === false} onClick={() => setPain(false)} className="px-6 py-3 text-lg">
            All good
          </Chip>
          <Chip on={pain === true} onClick={() => setPain(true)} className="px-6 py-3 text-lg">
            Something hurt
          </Chip>
        </div>

        <div className="mt-10">
          <Button variant="primary" size="lg" onClick={saveSession} disabled={!feel}>
            Save session
          </Button>
          {!feel && <p className="mt-2 text-sm text-ink-dim">Pick how it felt to save.</p>}
        </div>
      </div>
    );
  }

  // ---------- Done ----------
  if (stage === "done" && saved) {
    const allSessions = [...(sessions ?? []).filter((s) => s.id !== saved.id), saved];
    const unlockedNow = owners.flatMap((o) => {
      const after = evaluate(o, historyFor(o, allSessions, measurements ?? [], settings));
      return newlyUnlocked(before.current[o] ?? [], after).map((st) => ({ owner: o, st }));
    });
    return (
      <div>
        <PageTitle>Saved.</PageTitle>
        <ul className="mt-8 space-y-3 text-xl">
          {players.map((p) => {
            const days = practiceDays(allSessions, p, settings.minMinutesPerDay);
            const n = daysThisWeek(days, new Date());
            const todayMin = allSessions
              .filter((s) => s.players.includes(p) && dayKey(new Date(s.startedAt)) === dayKey(new Date()))
              .reduce((m, s) => m + s.minutes, 0);
            const short = settings.minMinutesPerDay - todayMin;
            if (isQuiet(settings, p)) {
              return (
                <li key={p}>
                  <b style={{ color: `var(--${p})` }}>{PLAYERS[p].name}</b>: {saved.minutes} minutes in.
                </li>
              );
            }
            return (
              <li key={p}>
                <b style={{ color: `var(--${p})` }}>{PLAYERS[p].name}</b>: {n} of {goalFor(settings, p)} days this week
                {short > 0 && (
                  <span className="block text-base text-ink-dim">
                    Play {short} more minute{short === 1 ? "" : "s"} today and it counts.
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {unlockedNow.length > 0 && (
          <section className="mt-10">
            <h2 className="display text-4xl">Unlocked!</h2>
            <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-8">
              {unlockedNow.map(({ owner, st }) => {
                const c = ownerColor(owner);
                return (
                  <li key={`${owner}:${st.def.id}`} className="flex w-72 items-center gap-4">
                    <Sticker state={st} color={c.color} on={c.on} size={96} pop />
                    <div>
                      <p className="text-lg leading-tight font-bold">{st.def.title}</p>
                      <p className="text-sm text-ink-dim">
                        {owner === "together" ? "Together" : PLAYERS[owner].name}: {st.def.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href="/progress" className="mt-6 inline-block font-semibold underline decoration-2 underline-offset-4">
              See all achievements
            </Link>
          </section>
        )}
        {newBests.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold">New this session</h2>
            <ul className="mt-3 space-y-2">
              {newBests.map((b) => (
                <li key={b} className="text-lg font-bold text-good">
                  {b}
                </li>
              ))}
            </ul>
          </>
        )}
        {pain === true && (
          <p className="mt-8 max-w-prose rounded-(--r) border-(length:--bw) border-ink bg-surface p-4">
            Rest it. Next time the app will start you with a short, easy session.
          </p>
        )}
        <div className="mt-10 flex gap-3">
          <Link href="/" className="rounded-(--r) border-(length:--bw) border-ink bg-action px-7 py-4 text-lg font-semibold text-action-ink hover:bg-action-hi">
            Home
          </Link>
          <Button size="lg" onClick={() => { setSeed((s) => s + 1); setStage("setup"); }}>
            Another session
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Running ----------
  if (!block) return null;
  const over = !countUp && blockLeft <= 0;
  return (
    <div>
      {/* Progress through the blocks */}
      <ol className="flex gap-1.5" aria-label="Session progress">
        {blocks.map((b, i) => (
          <li
            key={i}
            className={`h-3.5 rounded-full border-2 border-ink ${i < idx ? "bg-action" : i === idx ? "candy-stripes bg-action" : "bg-surface-2"}`}
            style={{ flexGrow: Math.max(1, b.plannedMin) }}
            title={b.title}
          />
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="num text-sm text-ink-dim">
          Block {idx + 1} of {blocks.length}, {fmt(elapsed)} played
        </span>
        <div className="flex flex-wrap gap-2">
          <Chip on={drawer === "tuner"} onClick={() => setDrawer(drawer === "tuner" ? "none" : "tuner")}>
            Tuner
          </Chip>
          <Chip on={drawer === "metronome"} onClick={() => setDrawer(drawer === "metronome" ? "none" : "metronome")}>
            Metronome
          </Chip>
          <Button variant="ghost" onClick={() => endSession()}>
            End session
          </Button>
        </div>
      </div>

      {drawer !== "none" && (
        <div className="candy mt-4 rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5 md:p-7">
          {drawer === "tuner" ? <TunerPanel compact /> : <MetronomePanel api={metro} compact />}
        </div>
      )}

      <header className="mt-8 grid items-end gap-6 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          {blockLabel(block) !== block.title && (
            <p className="text-lg font-semibold text-ink-dim">{blockLabel(block)}</p>
          )}
          <h1
            className={`display mt-1 ${
              block.title.length > 18
                ? "text-[clamp(2rem,4.2vw,3.25rem)]"
                : "text-[clamp(2.25rem,5.5vw,4.25rem)]"
            }`}
          >
            {block.title}
          </h1>
        </div>
        <div className="sm:text-right">
          <div className={`display num text-6xl ${over ? "text-good" : ""}`}>
            {countUp ? formatClock(blockElapsed) : formatClock(blockLeft)}
          </div>
          <div className="mt-3 flex gap-2 sm:justify-end">
            <Button onClick={back} disabled={idx === 0} aria-label="Previous block">
              Back
            </Button>
            <Button onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</Button>
            <Button variant="primary" onClick={next}>
              {idx < blocks.length - 1 ? "Next" : "Finish"}
            </Button>
          </div>
        </div>
      </header>
      {over && (
        <p className="mt-3 text-right font-semibold">Planned time&apos;s up. Keep going if you like: overtime counts too.</p>
      )}
      {paused && <p className="mt-3 text-right font-semibold text-live">Paused</p>}

      <div className="mt-10" key={`${idx}:${block.ref}`}>
        <BlockView
          block={block}
          players={players}
          who={who}
          metro={metro}
          changeBests={changeBests}
          bpmBests={bpmBests}
          elapsed={blockElapsed}
          trail={trails[idx] ?? []}
          funOptions={funChoices}
          seed={seed}
          onJump={(sec) => setBlockTimes((bt) => bt.map((v, i) => (i === idx ? sec : v)))}
          onChangeSaved={onChangeSaved}
          onNailed={onNailed}
          onTryPair={(pair) =>
            setBlocks((bs) =>
              bs.map((b, i) =>
                i === idx
                  ? {
                      ...b,
                      title: `${pair[0]} to ${pair[1]} changes`,
                      ref: `changes:${pairId(pair)}`,
                      payload: { type: "changes", pair, best: null, goal: 20 },
                    }
                  : b,
              ),
            )
          }
          onSwapFun={(idea) =>
            setBlocks((bs) =>
              bs.map((b, i) =>
                i === idx ? { ...b, title: idea.title, ref: `fun:${idea.id}`, payload: { type: "fun", idea } } : b,
              ),
            )
          }
        />
      </div>
    </div>
  );
}
