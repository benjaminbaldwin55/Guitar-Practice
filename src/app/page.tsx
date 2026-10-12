"use client";

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

const OPTIONS: { who: Who; color: string; sub: string }[] = [
  { who: "ben", color: "var(--ben)", sub: PLAYERS.ben.guitar },
  { who: "anna", color: "var(--anna)", sub: PLAYERS.anna.guitar },
  { who: "both", color: "var(--brass)", sub: "Together" },
];

export default function Home() {
  const { settings, setActiveWho, ready } = useApp();
  const sessions = useSessions() ?? [];
  const now = new Date();
  const keys = weekDayKeys(now);
  const today = dayKey(now);
  const target = settings.weeklyTargetDays;
  const active = settings.activeWho;

  return (
    <div>
      <h1 className="text-lg text-pearl-dim">Who&apos;s playing?</h1>

      <ul className="mt-6 border-t border-line">
        {OPTIONS.map(({ who, color, sub }) => {
          const days =
            who === "both"
              ? togetherDays(sessions, settings.minMinutesPerDay)
              : practiceDays(sessions, who, settings.minMinutesPerDay);
          const count = daysThisWeek(days, now);
          const streak = weekStreak(days, now, target);
          const selected = active === who;
          return (
            <li key={who} className="border-b border-line">
              <button
                type="button"
                onClick={() => setActiveWho(who)}
                aria-pressed={selected}
                disabled={!ready}
                className="group grid w-full grid-cols-1 items-end gap-4 py-6 text-left sm:grid-cols-[1fr_auto] md:py-8"
              >
                <span>
                  <span
                    className="display block text-[clamp(3rem,9vw,6.5rem)] transition-colors"
                    style={{ color: selected ? color : undefined }}
                  >
                    <span
                      className={
                        selected ? "" : "text-pearl-faint group-hover:text-pearl-dim"
                      }
                    >
                      {whoLabel(who)}
                    </span>
                  </span>
                  <span className="mt-3 block text-sm text-pearl-faint">{sub}</span>
                </span>
                <span className="flex items-end gap-6 sm:flex-col sm:items-end sm:gap-3">
                  <WeekDots keys={keys} played={days} today={today} color={color} />
                  <span className="num text-sm text-pearl-dim">
                    {count} of {target} this week
                    {streak > 0 && (
                      <span className="text-pearl-faint">
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
            className="rounded-md bg-brass px-6 py-3.5 font-semibold text-rosewood transition-colors hover:bg-brass-hi"
          >
            Start practice
          </Link>
        ) : (
          <p className="text-pearl-dim">Pick who&apos;s playing to start.</p>
        )}
      </div>
    </div>
  );
}
