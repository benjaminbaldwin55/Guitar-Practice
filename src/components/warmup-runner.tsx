"use client";

import { useEffect, useRef, useState } from "react";
import type { WarmupStep } from "@/content/warmups";
import { beep } from "@/lib/audio/beep";
import { Button } from "./ui";

/** Walks through warm-up steps with a timer each. Beeps between steps. */
export function WarmupRunner({ steps, onDone }: { steps: WarmupStep[]; onDone?: () => void }) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(steps[0]?.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  useEffect(() => {
    if (!running || left > 0) return;
    if (i < steps.length - 1) {
      beep(880);
      setI(i + 1);
      setLeft(steps[i + 1].seconds);
    } else {
      beep(1320, 300);
      setRunning(false);
      setFinished(true);
      onDone?.();
    }
  }, [left, running, i, steps, onDone]);

  return (
    <div>
      <ol className="space-y-3">
        {steps.map((s, n) => {
          const current = n === i && !finished;
          const done = n < i || finished;
          return (
            <li
              key={s.id}
              className={`rounded-[min(var(--r),16px)] border-(length:--bw) border-ink p-4 transition-colors md:p-5 ${
                current ? "bg-ink text-bg" : done ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-xl font-bold">{s.title}</h3>
                <span className="num font-semibold">
                  {current ? `${left}s` : done ? "Done" : `${s.seconds}s`}
                </span>
              </div>
              <p className={`mt-1 ${current ? "" : "text-ink-dim"}`}>{s.how}</p>
            </li>
          );
        })}
      </ol>
      {!finished && (
        <div className="mt-5 flex gap-3">
          <Button variant={running ? "quiet" : "primary"} onClick={() => setRunning(!running)}>
            {running ? "Pause" : i === 0 && left === steps[0].seconds ? "Start warm-up" : "Resume"}
          </Button>
          <Button variant="ghost" onClick={() => {
              setLeft(0);
              setRunning(true);
            }}>
            Skip this one
          </Button>
        </div>
      )}
    </div>
  );
}
