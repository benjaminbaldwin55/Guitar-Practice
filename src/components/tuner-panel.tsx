"use client";

import { useState } from "react";
import { useTuner } from "@/lib/audio/use-tuner";
import { centsOff, noteName } from "@/lib/music/pitch";
import { nearestString, TUNINGS } from "@/lib/music/tunings";
import { Button, Chip } from "./ui";

const IN_TUNE = 5; // cents

export function TunerPanel({ compact = false }: { compact?: boolean }) {
  const { status, reading, start, stop } = useTuner();
  const [tuningId, setTuningId] = useState("standard");
  const tuning = TUNINGS.find((t) => t.id === tuningId) ?? TUNINGS[0];

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
        {TUNINGS.map((t) => (
          <Chip key={t.id} on={t.id === tuningId} onClick={() => setTuningId(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>
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
