"use client";

import { useEffect } from "react";
import type { Subdivision } from "@/lib/audio/metronome";
import { useMetronome, type MetronomeApi } from "@/lib/audio/use-metronome";
import { Button, Chip } from "./ui";

const SUBS: { v: Subdivision; label: string }[] = [
  { v: 1, label: "Quarters" },
  { v: 2, label: "Eighths" },
  { v: 3, label: "Triplets" },
  { v: 4, label: "16ths" },
];

/** Beat lights. The first beat of each bar is red. */
export function BeatLights({ api }: { api: MetronomeApi }) {
  const { opts, tick } = api;
  return (
    <ol className="flex gap-2" aria-hidden>
      {Array.from({ length: opts.beatsPerBar }, (_, i) => {
        const on = tick?.beat === i;
        const down = i === 0 && opts.accent;
        return (
          <li
            key={i}
            className={`h-10 flex-1 rounded-(--r) border-(length:--bw) border-ink transition-colors duration-75 ${
              on ? (down ? "bg-live" : "bg-ink") : ""
            }`}
          />
        );
      })}
    </ol>
  );
}

/**
 * Full metronome. Pass `api` to share one metronome with a parent (the
 * practice runner does this); otherwise it makes its own.
 */
export function MetronomePanel({
  api: external,
  compact = false,
  showTrainer = true,
}: {
  api?: MetronomeApi;
  compact?: boolean;
  showTrainer?: boolean;
}) {
  const own = useMetronome();
  const api = external ?? own;
  const { opts, update, running, toggle, tap, trainer, setTrainer } = api;

  // Space starts and stops, unless you're typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== "Space" || /INPUT|TEXTAREA|BUTTON/.test(t.tagName)) return;
      e.preventDefault();
      toggle();
    };
    if (compact) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, compact]);

  return (
    <div>
      <div className="flex items-end justify-center gap-6">
        <Button
          size={compact ? "md" : "lg"}
          onClick={() => update({ bpm: opts.bpm - 1 })}
          aria-label="Slower"
        >
          −
        </Button>
        <div className="text-center">
          <div
            className={`display num ${compact ? "text-6xl" : "text-[clamp(5rem,13vw,9rem)]"}`}
            aria-live="polite"
          >
            {opts.bpm}
          </div>
          <div className="mt-1 text-sm text-ink-dim">beats per minute</div>
        </div>
        <Button
          size={compact ? "md" : "lg"}
          onClick={() => update({ bpm: opts.bpm + 1 })}
          aria-label="Faster"
        >
          +
        </Button>
      </div>

      <input
        type="range"
        min={40}
        max={200}
        value={opts.bpm}
        onChange={(e) => update({ bpm: Number(e.target.value) })}
        aria-label="Tempo"
        className="mt-6 w-full accent-[var(--ink)]"
      />

      <div className="mt-6">
        <BeatLights api={api} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" size="lg" onClick={toggle} className="min-w-40">
          {running ? "Stop" : "Start"}
        </Button>
        <Button size="lg" onClick={tap}>
          Tap tempo
        </Button>
      </div>

      {!compact && (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Beats per bar</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {[2, 3, 4, 6].map((n) => (
                <Chip key={n} on={opts.beatsPerBar === n} onClick={() => update({ beatsPerBar: n })}>
                  {n}
                </Chip>
              ))}
              <Chip on={opts.accent} onClick={() => update({ accent: !opts.accent })}>
                Accent beat 1
              </Chip>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Clicks per beat</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUBS.map((s) => (
                <Chip key={s.v} on={opts.subdivision === s.v} onClick={() => update({ subdivision: s.v })}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTrainer && !compact && (
        <div className="mt-10 border-t-(length:--bw) border-line pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Speed trainer</h3>
              <p className="mt-1 max-w-prose text-sm text-ink-dim">
                Adds {trainer.step} BPM every {trainer.everyBars} bars, up to{" "}
                {trainer.maxBpm}. Start slow and clean, and let it pull you faster.
              </p>
            </div>
            <Chip on={trainer.on} onClick={() => setTrainer({ ...trainer, on: !trainer.on })}>
              {trainer.on ? "On" : "Off"}
            </Chip>
          </div>
          {trainer.on && (
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <Stepper
                label="Step"
                value={trainer.step}
                suffix="BPM"
                onChange={(v) => setTrainer({ ...trainer, step: Math.max(1, Math.min(10, v)) })}
              />
              <Stepper
                label="Every"
                value={trainer.everyBars}
                suffix="bars"
                onChange={(v) => setTrainer({ ...trainer, everyBars: Math.max(1, Math.min(16, v)) })}
              />
              <Stepper
                label="Up to"
                value={trainer.maxBpm}
                suffix="BPM"
                step={5}
                onChange={(v) => setTrainer({ ...trainer, maxBpm: Math.max(50, Math.min(220, v)) })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  suffix,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-dim">{label}</span>
      <Button size="sm" onClick={() => onChange(value - step)} aria-label={`${label} down`}>
        −
      </Button>
      <span className="num min-w-16 text-center font-semibold">
        {value} {suffix}
      </span>
      <Button size="sm" onClick={() => onChange(value + step)} aria-label={`${label} up`}>
        +
      </Button>
    </div>
  );
}
