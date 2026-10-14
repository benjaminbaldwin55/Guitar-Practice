"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { CandyBar } from "@/components/candy-bar";
import { goalFor, isQuiet } from "@/lib/goals";
import { WeekDots } from "@/components/week-dots";
import { PLAYERS, whoLabel } from "@/lib/players";
import {
  dayKey,
  daysThisWeek,
  practiceDays,
  togetherDays,
  weekDayKeys,
  weekStreak,
} from "@/lib/streaks";
import type { PlayerId, Who } from "@/lib/types";
import { useSessions } from "@/lib/use-sessions";
import { nextUnlock, UNLOCK_AT } from "@/content/chord-path";
import { playersFor } from "@/lib/players";
import { groupBests } from "@/lib/session/builder";
import { bestsOf, useMeasurements } from "@/lib/use-measurements";

const OPTIONS: { who: Who; color: string; on: string; sub: string }[] = [
  { who: "ben", color: "var(--ben)", on: "var(--on-ben)", sub: PLAYERS.ben.guitar },
  { who: "anna", color: "var(--anna)", on: "var(--on-anna)", sub: PLAYERS.anna.guitar },
  { who: "both", color: "var(--both)", on: "var(--on-both)", sub: "Together" },
];

/** The player's best chord-change score, for players who'd rather not see streaks. */
function personalBest(bests: Record<string, number>): { pair: string; value: number } | null {
  const top = Object.entries(bests).sort((a, b) => b[1] - a[1])[0];
  return top ? { pair: top[0].replace("-", " ⇄ "), value: top[1] } : null;
}

function timeOfDay(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "this late";
  if (h < 12) return "this morning";
  if (h < 17) return "this afternoon";
  return "tonight";
}

export default function Home() {
  const { settings, setActiveWho, ready } = useApp();
  const sessions = useSessions() ?? [];
  const { all: measurements } = useMeasurements();
  const changeBests = bestsOf(measurements ?? [], "chord-changes");
  const now = new Date();
  const keys = weekDayKeys(now);
  const today = dayKey(now);
  const active = settings.activeWho;

  return (
    <div>
      <h1 className="display text-[clamp(2.25rem,5vw,3.75rem)]">Who&apos;s playing {timeOfDay(now)}?</h1>

      <ul className="mt-6 border-t-(length:--bw) border-line">
        {OPTIONS.map(({ who, color, on, sub }) => {
          const days =
            who === "both"
              ? togetherDays(sessions, settings.minMinutesPerDay)
              : practiceDays(sessions, who, settings.minMinutesPerDay);
          const count = daysThisWeek(days, now);
          const target = goalFor(settings, who);
          const streak = weekStreak(days, now, target);
          const quiet = isQuiet(settings, who);
          const pb = quiet ? personalBest(changeBests[who as PlayerId] ?? {}) : null;
          const selected = active === who;
          const unlock = nextUnlock(groupBests(playersFor(who), changeBests));
          return (
            <li key={who} className="border-b-(length:--bw) border-line py-2">
              <button
                type="button"
                onClick={() => setActiveWho(who)}
                aria-pressed={selected}
                disabled={!ready}
                className={`group grid w-full grid-cols-1 items-end gap-4 rounded-[min(var(--r),28px)] px-4 py-5 text-left transition-[transform,background-color] sm:grid-cols-[1fr_auto] md:px-6 md:py-7 ${
                  selected ? "candy -rotate-1 border-(length:--bw) border-ink" : "border-(length:--bw) border-transparent"
                }`}
                style={
                  selected
                    ? ({
                        background: color,
                        color: on,
                        "--ink": on,
                        "--ink-dim": on,
                        "--ink-faint": on,
                        "--line": on,
                      } as CSSProperties)
                    : undefined
                }
              >
                <span>
                  <span
                    className={`display block text-[clamp(3rem,9vw,6.5rem)] ${
                      selected ? "" : "transition-transform group-hover:translate-x-1"
                    }`}
                    style={selected ? undefined : { color }}
                  >
                    {whoLabel(who)}
                  </span>
                  <span className="mt-3 block text-sm text-ink-faint">{sub}</span>
                  {unlock && (
                    <span className="mt-2 flex items-center gap-3 text-sm font-semibold">
                      <CandyBar
                        value={unlock.best}
                        max={UNLOCK_AT}
                        color={selected ? on : color}
                        track={selected ? "rgb(255 255 255 / 0.4)" : undefined}
                        className="w-32"
                        label="Progress to the next chord unlock"
                      />
                      {unlock.pair[0]} ⇄ {unlock.pair[1]}: {unlock.best} of {UNLOCK_AT} to unlock {unlock.opens[0]} ⇄{" "}
                      {unlock.opens[1]}
                    </span>
                  )}
                </span>
                {quiet ? (
                  <span className="text-sm text-ink-dim sm:text-right">
                    {pb ? (
                      <>
                        Personal best
                        <span className="display num mt-1 block text-3xl text-ink">{pb.value}</span>
                        {pb.pair} changes a minute
                      </>
                    ) : (
                      "Personal bests show up here as you play."
                    )}
                  </span>
                ) : (
                  <span className="flex items-end gap-6 sm:flex-col sm:items-end sm:gap-3">
                    <WeekDots keys={keys} played={days} today={today} color={selected ? on : color} />
                    <span className="num text-sm text-ink-dim">
                      {count} of {target} this week
                      {streak > 0 && (
                        <span className="text-ink-faint">
                          , {streak} {streak === 1 ? "week" : "weeks"} in a row
                        </span>
                      )}
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        {active ? (
          <Link
            href="/practice"
            className="candy-sm press rounded-(--r) border-(length:--bw) border-ink bg-action px-7 py-4 text-lg font-semibold text-action-ink hover:bg-action-hi"
          >
            Start practice
          </Link>
        ) : (
          <p className="text-ink-dim">Pick who&apos;s playing to start.</p>
        )}
      </div>
    </div>
  );
}
