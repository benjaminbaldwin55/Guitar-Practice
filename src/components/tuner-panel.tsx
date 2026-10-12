"use client";

import { useState } from "react";
import { useTuner } from "@/lib/audio/use-tuner";
import { centsOff, noteName } from "@/lib/music/pitch";
import {
  customTuning,
  DEFAULT_TUNING_LIST,
  findTuning,
  nearestString,
  TUNINGS,
  type Tuning,
} from "@/lib/music/tunings";
import { useApp } from "./app-provider";
import { Button, Chip } from "./ui";

const IN_TUNE = 5; // cents

export function TunerPanel({ compact = false }: { compact?: boolean }) {
  const { status, reading, start, stop } = useTuner();
  const { settings, updateSettings } = useApp();
  const [adding, setAdding] = useState(false);
  const ids = settings.tunings?.length ? settings.tunings : DEFAULT_TUNING_LIST;
  const list = ids.map(findTuning).filter(Boolean) as Tuning[];
  const tuning = list[0] ?? TUNINGS[0];
  // Picking a tuning moves it to the front, so the list stays "most recent first".
  const use = (id: string) => updateSettings({ tunings: [id, ...ids.filter((x) => x !== id)] });
  const remove = (id: string) => updateSettings({ tunings: ids.filter((x) => x !== id) });

  const listening = status === "listening";
  const midiFloat = reading ? 12 * Math.log2(reading.freq / 440) + 69 : null;
  const target = midiFloat !== null ? nearestString(tuning, midiFloat) : null;
  const targetString = target !== null ? tuning.strings[target] : null;
  const cents =
    reading && targetString ? centsOff(reading.freq, targetString.midi) : null;
  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE;
  const clamped = cents === null ? 0 : Math.max(-50, Math.min(50, cents));

  let hint = "Play one string at a time";
  if (cents !== null) {
    if (inTune) hint = "In tune";
    else if (Math.abs(cents) > 100) hint = `Way off. Aim for ${targetString!.name}`;
    else hint = cents > 0 ? "Sharp. Loosen it a little" : "Flat. Tighten it a little";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {list.map((t) => (
          <Chip key={t.id} on={t.id === tuning.id} onClick={() => use(t.id)}>
            {t.label}
          </Chip>
        ))}
        <Chip on={adding} onClick={() => setAdding(!adding)} aria-label="Add a tuning">
          +
        </Chip>
      </div>
      {adding && (
        <AddTuning
          inList={ids}
          onAdd={(id) => {
            use(id);
            setAdding(false);
          }}
          onRemove={remove}
        />
      )}
      {tuning.note && !compact && (
        <p className="mt-3 text-sm text-ink-dim">{tuning.note}</p>
      )}

      {/* The strings. The one you're playing lights up. */}
      <ol className="mt-6 grid grid-cols-6 gap-2">
        {tuning.strings.map((s, i) => {
          const active = i === target && listening;
          return (
            <li
              key={i}
              className={`flex flex-col items-center rounded-(--r) border-(length:--bw) border-ink py-3 transition-colors ${
                active ? (inTune ? "bg-good text-white" : "bg-ink text-bg") : ""
              }`}
            >
              <span className="text-xl font-bold" style={{ fontStretch: "115%" }}>
                {s.name}
              </span>
              <span className="text-[11px] opacity-70">{6 - i}</span>
            </li>
          );
        })}
      </ol>

      <div className={`${compact ? "mt-6" : "mt-10"} text-center`}>
        <div
          className={`display num ${compact ? "text-7xl" : "text-[clamp(6rem,16vw,11rem)]"} ${
            inTune ? "text-good" : ""
          }`}
          aria-live="polite"
        >
          {reading && targetString ? noteName(reading.midi) : "–"}
        </div>

        {/* Meter: flat on the left, sharp on the right. */}
        <div className="relative mx-auto mt-6 h-12 max-w-xl" aria-hidden>
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-ink" />
          {[-50, -25, 0, 25, 50].map((c) => (
            <div
              key={c}
              className="absolute top-1/2 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-ink"
              style={{ left: `${50 + c}%`, height: c === 0 ? 40 : 16 }}
            />
          ))}
          <div
            className={`absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-(length:--bw) border-ink transition-[left] duration-100 ${
              cents === null ? "bg-surface-2" : inTune ? "bg-good" : "bg-live"
            }`}
            style={{ left: `${50 + clamped}%` }}
          />
        </div>
        <div className="mx-auto mt-1 flex max-w-xl justify-between text-xs text-ink-dim">
          <span>Flat</span>
          <span>Sharp</span>
        </div>
        <p className="mt-4 text-lg font-semibold">
          {listening ? hint : " "}
          {cents !== null && !inTune && Math.abs(cents) <= 100 && (
            <span className="num ml-2 font-normal text-ink-dim">
              {cents > 0 ? "+" : ""}
              {Math.round(cents)} cents
            </span>
          )}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {listening ? (
          <Button variant="quiet" size="lg" onClick={stop}>
            <span className="size-3 animate-pulse rounded-full bg-live" />
            Stop tuner
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={start}
            disabled={status === "starting"}
          >
            Start tuner
          </Button>
        )}
      </div>
      {status === "blocked" && (
        <p className="mt-4 text-center text-live">
          The tuner needs the microphone. Allow mic access in your browser&apos;s
          address bar, then press Start tuner again.
        </p>
      )}
    </div>
  );
}

/** The + panel: pick from presets, or build your own string by string. */
function AddTuning({
  inList,
  onAdd,
  onRemove,
}: {
  inList: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [custom, setCustom] = useState<number[]>(TUNINGS[0].strings.map((s) => s.midi));
  const preview = customTuning(custom);
  const bump = (i: number, d: number) =>
    setCustom((c) => c.map((m, j) => (j === i ? Math.max(c[i] - 5, Math.min(c[i] + 5, m + d)) : m)));

  return (
    <div className="candy mt-4 rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5">
      <h3 className="font-semibold">Add a tuning</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {TUNINGS.map((t) => {
          const has = inList.includes(t.id);
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-(--r) border-2 border-ink px-3 py-2">
              <span>
                <b>{t.label}</b>
                <span className="ml-2 text-sm text-ink-dim">{t.strings.map((x) => x.name).join(" ")}</span>
              </span>
              {has ? (
                inList.length > 1 ? (
                  <Button size="sm" variant="ghost" onClick={() => onRemove(t.id)}>
                    Remove
                  </Button>
                ) : (
                  <span className="text-sm text-ink-dim">In list</span>
                )
              ) : (
                <Button size="sm" onClick={() => onAdd(t.id)}>
                  Add
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="mt-6 font-semibold">Or make your own</h3>
      <div className="mt-3 grid grid-cols-6 gap-2">
        {custom.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Button size="sm" onClick={() => bump(i, 1)} aria-label={`String ${6 - i} up`}>
              ▲
            </Button>
            <span className="py-1 text-lg font-bold">{preview.strings[i].name}</span>
            <Button size="sm" onClick={() => bump(i, -1)} aria-label={`String ${6 - i} down`}>
              ▼
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => onAdd(preview.id)} disabled={inList.includes(preview.id)}>
          Add {preview.label}
        </Button>
        {inList
          .filter((id) => id.startsWith("custom:"))
          .map((id) => (
            <Button key={id} size="sm" variant="ghost" onClick={() => onRemove(id)}>
              Remove {findTuning(id)?.label}
            </Button>
          ))}
      </div>
    </div>
  );
}
