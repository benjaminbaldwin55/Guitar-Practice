"use client";

import type { FunIdea } from "@/content/drills";
import { SCALES } from "@/content/scales";
import { songLesson, songsFor } from "@/content/song-ideas";
import { STRUM_BY_ID } from "@/content/strums";
import type { MetronomeApi } from "@/lib/audio/use-metronome";
import { PLAYERS } from "@/lib/players";
import type { PlannedBlock } from "@/lib/session/builder";
import type { TempoRun } from "@/lib/tempo";
import type { PlayerId, Who } from "@/lib/types";
import type { Bests } from "@/lib/use-measurements";
import { ChangeCounter, type ChangeResult } from "./change-counter";
import { ChordDiagram } from "./chord-diagram";
import { LessonLink } from "./lesson-link";
import { MetronomePanel } from "./metronome-panel";
import { ScaleBox } from "./scale-box";
import { StrumPatternView } from "./strum-pattern";
import { Button } from "./ui";
import { WarmupRunner } from "./warmup-runner";

export const KIND_LABEL: Record<string, string> = {
  warmup: "Warm-up",
  edge: "Chord changes",
  strum: "Strumming",
  scale: "Scale",
  progression: "Progression",
  fun: "Fun",
  break: "Break",
};

export function blockLabel(b: PlannedBlock): string {
  return KIND_LABEL[b.payload.type === "changes" ? "edge" : b.payload.type] ?? "";
}

function Chords({ ids, bars }: { ids: string[]; bars?: number[] }) {
  return (
    <ol className="flex flex-wrap gap-x-8 gap-y-6">
      {ids.map((c, i) => (
        <li key={`${c}-${i}`} className="flex flex-col items-center">
          <ChordDiagram id={c} size={110} />
          {bars && <span className="mt-1 text-sm text-ink-dim">{bars[i] ?? 1} bar{(bars[i] ?? 1) > 1 ? "s" : ""}</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * Tempo for this block: where it started, last time's run, every tempo you
 * nailed today, and the "Nailed it" button that saves it and steps up 5.
 */
function TempoTrail({
  metro,
  players,
  startBpm,
  last,
  trail,
  bestBpm,
  onNailed,
}: {
  metro: MetronomeApi;
  players: PlayerId[];
  startBpm: number;
  last?: TempoRun;
  trail: number[];
  bestBpm: number | null;
  onNailed: (bpm: number) => Promise<void>;
}) {
  return (
    <div className="mt-8 rounded-[min(var(--r),20px)] border-(length:--bw) border-ink p-5">
      <p className="text-sm text-ink-dim">
        {last
          ? `Last time you went from ${last.start} to ${Math.max(last.start, last.top)} BPM, so today starts halfway, at ${startBpm}.`
          : `Starting at ${startBpm} BPM. Get a few bars clean, then speed up.`}
        {bestBpm ? ` Best ever: ${bestBpm}.` : ""}
      </p>
      <ol className="mt-3 flex flex-wrap items-center gap-2" aria-label="Tempos this session">
        <li className="num rounded-(--r) border-2 border-ink px-2.5 py-1 text-sm font-bold opacity-60">{startBpm}</li>
        {trail.map((b, i) => (
          <li key={i} className="num rounded-(--r) border-2 border-ink bg-ink px-2.5 py-1 text-sm font-bold text-bg">
            {b}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button
          variant="primary"
          onClick={async () => {
            const bpm = metro.opts.bpm;
            await onNailed(bpm);
            metro.update({ bpm: bpm + 5 });
          }}
        >
          Nailed it at {metro.opts.bpm}
        </Button>
        <span className="text-sm text-ink-dim">
          Saves it for {players.map((p) => PLAYERS[p].name).join(" & ")} and bumps the tempo up 5.
        </span>
      </div>
    </div>
  );
}

function FunBlock({
  idea,
  who,
  options,
  seed,
  onSwap,
}: {
  idea: FunIdea;
  who: Who;
  options: FunIdea[];
  seed: number;
  onSwap: (idea: FunIdea) => void;
}) {
  const others = options.filter((o) => o.id !== idea.id);
  const swaps = [others[seed % others.length], others[(seed + 1) % others.length]].filter(
    (x, i, a) => x && a.indexOf(x) === i,
  );
  // One easy song, one stretch, and one wildcard (could be a goal song).
  const songs = songsFor(who);
  const byLevel = (l: number) => songs.filter((x) => x.level === l);
  const pickFrom = <T,>(xs: T[], k: number) => (xs.length ? xs[k % xs.length] : undefined);
  const snack = [pickFrom(byLevel(1), seed), pickFrom(byLevel(2), seed), pickFrom(songs, seed + 7)].filter(
    (x, i, a): x is NonNullable<typeof x> => !!x && a.indexOf(x) === i,
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <p className="max-w-prose text-xl">{idea.how}</p>
        {idea.watch && (
          <p className="mt-4">
            <LessonLink query={idea.watch.query} label={idea.watch.label} />
          </p>
        )}
        {idea.needs && (
          <div className="mt-8">
            <Chords ids={idea.needs} />
          </div>
        )}
        {idea.scale && (
          <div className="mt-8 max-w-md">
            <ScaleBox id={idea.scale} />
          </div>
        )}
        {swaps.length > 0 && (
          <div className="mt-10">
            <h3 className="font-semibold">Not feeling it? Swap for</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {swaps.map((o) => (
                <Button key={o.id} onClick={() => onSwap(o)}>
                  {o.title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="self-start rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5">
        <h3 className="text-xl font-black" style={{ fontStretch: "115%" }}>
          Or play a song
        </h3>
        <p className="mt-1 text-sm text-ink-dim">Picked from your taste. Each opens a beginner lesson.</p>
        <ul className="mt-4 space-y-4">
          {snack.map((s) => (
            <li key={s.title}>
              <a href={songLesson(s)} target="_blank" rel="noreferrer" className="group block">
                <span className="font-bold underline decoration-2 underline-offset-4 group-hover:text-ink-dim">
                  {s.title}
                </span>{" "}
                <span className="text-ink-dim">{s.artist}</span> <span aria-hidden>↗</span>
                <span className="mt-0.5 block text-sm text-ink-dim">
                  {s.level === 1 ? "Easy" : s.level === 2 ? "A stretch" : "Goal song"}. {s.why}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export function BlockView({
  block,
  players,
  who,
  metro,
  changeBests,
  bpmBests,
  elapsed,
  trail,
  funOptions,
  seed,
  onJump,
  onChangeSaved,
  onNailed,
  onSwapFun,
  onTryPair,
}: {
  block: PlannedBlock;
  players: PlayerId[];
  who: Who;
  metro: MetronomeApi;
  changeBests: Bests;
  bpmBests: Bests;
  elapsed: number;
  trail: number[];
  funOptions: FunIdea[];
  seed: number;
  onJump: (sec: number) => void;
  onChangeSaved: (r: ChangeResult, pair: [string, string]) => Promise<void>;
  onNailed: (bpm: number) => Promise<void>;
  onSwapFun: (idea: FunIdea) => void;
  onTryPair: (pair: [string, string]) => void;
}) {
  const p = block.payload;
  const best = block.ref ? Math.min(...players.map((pl) => bpmBests[pl][block.ref!] ?? Infinity)) : Infinity;
  const tempo =
    p.type === "strum" || p.type === "scale" || p.type === "progression" ? (
      <TempoTrail
        metro={metro}
        players={players}
        startBpm={p.bpm}
        last={p.last}
        trail={trail}
        bestBpm={Number.isFinite(best) ? best : null}
        onNailed={onNailed}
      />
    ) : null;
  const metroBox = (
    <div className="self-start rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5">
      <MetronomePanel api={metro} compact />
    </div>
  );

  switch (p.type) {
    case "warmup":
      return <WarmupRunner steps={p.steps} elapsed={elapsed} onJump={onJump} />;

    case "changes":
      return (
        <div>
          <ChangeCounter
            pair={p.pair}
            players={players}
            bests={changeBests}
            onSave={(r) => onChangeSaved(r, p.pair)}
            onTryPair={onTryPair}
          />
          <p className="mt-8 text-center">
            <LessonLink query={`${p.pair[0]} to ${p.pair[1]} chord change guitar beginner`} label="Tips for this switch" />
          </p>
        </div>
      );

    case "strum": {
      const pattern = STRUM_BY_ID[p.patternId];
      return (
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <StrumPatternView pattern={pattern} />
            <p className="mt-4 max-w-prose">{pattern.tip}</p>
            <p className="mt-4 max-w-prose text-ink-dim">
              Play the pattern on {p.chords.join(", then ")}, switching every bar. Eighth-note clicks are on so you can hear the &amp;.
            </p>
            <p className="mt-3">
              <LessonLink query={`${pattern.name} strumming pattern beginner guitar`} />
            </p>
            <div className="mt-6">
              <Chords ids={p.chords} />
            </div>
            {tempo}
          </div>
          {metroBox}
        </div>
      );
    }

    case "scale": {
      const sc = SCALES[p.scaleId];
      return (
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <ScaleBox id={p.scaleId} />
            <p className="mt-4 max-w-prose font-semibold">{p.exercise}</p>
            <p className="mt-2 max-w-prose text-ink-dim">{sc.tip}</p>
            <p className="mt-3">
              <LessonLink query={`${sc.name} beginner guitar lesson`} />
            </p>
            {tempo}
          </div>
          {metroBox}
        </div>
      );
    }

    case "progression": {
      const pattern = STRUM_BY_ID[p.prog.strum];
      return (
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="max-w-prose text-lg">{p.prog.how}</p>
            <div className="mt-6">
              <Chords ids={p.prog.chords} bars={p.prog.bars ?? p.prog.chords.map(() => 1)} />
            </div>
            {pattern && (
              <div className="mt-8">
                <h3 className="font-semibold">Strum: {pattern.name}</h3>
                <div className="mt-3 max-w-md">
                  <StrumPatternView pattern={pattern} />
                </div>
              </div>
            )}
            <p className="mt-4">
              <LessonLink query={`${p.prog.chords.join(" ")} chord progression guitar beginner`} />
            </p>
            {tempo}
          </div>
          {metroBox}
        </div>
      );
    }

    case "fun":
      return <FunBlock idea={p.idea} who={who} options={funOptions} seed={seed} onSwap={onSwapFun} />;

    case "break":
      return (
        <p className="max-w-prose text-xl">
          Put the guitar down for a minute. Shake your hands out, roll your
          shoulders, and stretch your wrists. If anything aches, call it a day
          after the next block.
        </p>
      );
  }
}
