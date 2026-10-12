"use client";

import { useEffect, useRef } from "react";
import type { WarmupStep } from "@/content/warmups";
import { beep } from "@/lib/audio/beep";

/**
 * Warm-up steps, driven by the block's clock (the Pause, Back and Next at the
 * top control everything). Tap any step to jump to it. Beeps between steps.
 */
export function WarmupRunner({
  steps,
  elapsed,
  onJump,
}: {
  steps: WarmupStep[];
  elapsed: number;
  onJump: (sec: number) => void;
}) {
  const starts = steps.map((_, i) => steps.slice(0, i).reduce((n, s) => n + s.seconds, 0));
  const total = steps.reduce((n, s) => n + s.seconds, 0);
  const current = elapsed >= total ? steps.length : starts.findLastIndex((st) => elapsed >= st);
  const prev = useRef(current);

  useEffect(() => {
    if (current !== prev.current && current > prev.current) beep(current >= steps.length ? 1320 : 880, 200);
    prev.current = current;
  }, [current, steps.length]);

  return (
    <div>
      <ol className="space-y-3">
        {steps.map((s, n) => {
          const on = n === current;
          const done = n < current;
          const left = starts[n] + s.seconds - elapsed;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onJump(starts[n])}
                className={`w-full rounded-[min(var(--r),16px)] border-(length:--bw) border-ink p-4 text-left transition-colors md:p-5 ${
                  on ? "candy -rotate-[0.6deg] border-action bg-surface-2" : done ? "opacity-50 hover:opacity-80" : "hover:bg-surface"
                }`}
              >
                <span className="flex items-baseline justify-between gap-4">
                  <span className="text-xl font-bold">{s.title}</span>
                  <span className="num font-semibold">{on ? `${left}s` : done ? "Done" : `${s.seconds}s`}</span>
                </span>
                <span className={`mt-1 block ${on ? "text-ink" : "text-ink-dim"}`}>{s.how}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {current >= steps.length && (
        <p className="mt-5 text-lg font-bold">Warm-up done. Hit Next when you&apos;re ready.</p>
      )}
    </div>
  );
}
