"use client";

import { useState } from "react";
import { SCALES } from "@/content/scales";
import { STRUM_BY_ID } from "@/content/strums";
import type { MetronomeApi } from "@/lib/audio/use-metronome";
import { PLAYERS } from "@/lib/players";
import type { PlannedBlock } from "@/lib/session/builder";
import type { PlayerId } from "@/lib/types";
import type { Bests } from "@/lib/use-measurements";
import { ChangeCounter, type ChangeResult } from "./change-counter";
import { ChordDiagram } from "./chord-diagram";
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

/** "Nailed it": logs a clean tempo for each player and nudges the BPM up. */
function NailedIt({
  metro,
  players,
  bestBpm,
  onNailed,
}: {
  metro: MetronomeApi;
  players: PlayerId[];
  bestBpm: number | null;
  onNailed: (bpm: number) => Promise<void>;
}) {
  const [last, setLast] = useState<number | null>(null);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      <Button
        variant="primary"
        onClick={async () => {
          const bpm = metro.opts.bpm;
          await onNailed(bpm);
          setLast(bpm);
          metro.update({ bpm: bpm + 5 });
        }}
      >
        Nailed it at {metro.opts.bpm}
      </Button>
      <span className="text-sm text-ink-dim">
        {last
          ? `Saved ${last} BPM for ${players.map((p) => PLAYERS[p].name).join(" & ")}. Bumped to ${last + 5}.`
          : bestBpm
            ? `Best clean tempo: ${bestBpm} BPM`
            : "Tap it when you get through a few bars clean."}
      </span>
    </div>
  );
}

export function BlockView({
  block,
  players,
  metro,
  changeBests,
  bpmBests,
  onChangeSaved,
  onNailed,
}: {
  block: PlannedBlock;
  players: PlayerId[];
  metro: MetronomeApi;
  changeBests: Bests;
  bpmBests: Bests;
  onChangeSaved: (r: ChangeResult, pair: [string, string]) => Promise<void>;
  onNailed: (subject: string, bpm: number) => Promise<void>;
}) {
  const p = block.payload;
  const bestBpm = block.ref
    ? Math.min(...players.map((pl) => bpmBests[pl][block.ref!] ?? Infinity))
    : Infinity;
  const nailed = (
    <NailedIt
      metro={metro}
      players={players}
      bestBpm={Number.isFinite(bestBpm) ? bestBpm : null}
      onNailed={(bpm) => onNailed(block.ref ?? "", bpm)}
    />
  );
  const metroBox = (
    <div className="self-start rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5">
      <MetronomePanel api={metro} compact />
    </div>
  );

  switch (p.type) {
    case "warmup":
      return <WarmupRunner steps={p.steps} />;

    case "changes":
      return (
        <ChangeCounter
          pair={p.pair}
          players={players}
          bests={changeBests}
          onSave={(r) => onChangeSaved(r, p.pair)}
        />
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
            <div className="mt-6">
              <Chords ids={p.chords} />
            </div>
            {nailed}
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
            {nailed}
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
            {nailed}
          </div>
          {metroBox}
        </div>
      );
    }

    case "fun": {
      const { idea } = p;
      return (
        <div>
          <p className="max-w-prose text-xl">{idea.how}</p>
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
        </div>
      );
    }

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
