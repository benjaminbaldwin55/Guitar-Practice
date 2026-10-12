"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
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
import type { Who } from "@/lib/types";
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

export default function Home() {
  const { settings, setActiveWho, ready } = useApp();
  const sessions = useSessions() ?? [];
  const { all: measurements } = useMeasurements();
  const changeBests = bestsOf(measurements ?? [], "chord-changes");
  const now = new Date();
  const keys = weekDayKeys(now);
  const today = dayKey(now);
  const target = settings.weeklyTargetDays;
  const active = settings.activeWho;

  return (
    <div>
      <h1 className="text-lg text-ink-dim">Who&apos;s playing?</h1>

      <ul className="mt-6 border-t-(length:--bw) border-line">
        {OPTIONS.map(({ who, color, on, sub }) => {
          const days =
            who === "both"
              ? togetherDays(sessions, settings.minMinutesPerDay)
              : practiceDays(sessions, who, settings.minMinutesPerDay);
          const count = daysThisWeek(days, now);
          const streak = weekStreak(days, now, target);
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
                      <span className="h-2 w-28 overflow-hidden rounded-full border-2 border-current">
                        <span
                          className="block h-full bg-current"
                          style={{ width: `${(unlock.best / UNLOCK_AT) * 100}%` }}
                        />
                      </span>
                      {unlock.pair[0]} ⇄ {unlock.pair[1]}: {unlock.best} of {UNLOCK_AT} to unlock {unlock.opens[0]} ⇄{" "}
                      {unlock.opens[1]}
                    </span>
                  )}
                </span>
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
