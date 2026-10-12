import type { PlayerId, PracticeSession } from "./types";

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing d, at local midnight. */
export function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (s.getDay() + 6) % 7; // Mon=0 ... Sun=6
  s.setDate(s.getDate() - offset);
  return s;
}

/**
 * Days on which a player practiced at least `minMinutes` in total.
 * Minutes from several short sessions on the same day add up.
 */
export function practiceDays(
  sessions: PracticeSession[],
  player: PlayerId,
  minMinutes: number,
): Set<string> {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    if (!s.players.includes(player)) continue;
    const k = dayKey(new Date(s.startedAt));
    totals.set(k, (totals.get(k) ?? 0) + s.minutes);
  }
  const days = new Set<string>();
  for (const [k, m] of totals) if (m >= minMinutes) days.add(k);
  return days;
}

/** Days on which Ben and Anna played together for at least `minMinutes`. */
export function togetherDays(
  sessions: PracticeSession[],
  minMinutes: number,
): Set<string> {
  return practiceDays(
    sessions.filter((s) => s.players.length > 1),
    "ben",
    minMinutes,
  );
}

/** The 7 days (Mon..Sun) of the week containing `today`, as day keys. */
export function weekDayKeys(today: Date): string[] {
  const start = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dayKey(d);
  });
}

/** How many practice days fall in the week containing `today`. */
export function daysThisWeek(days: Set<string>, today: Date): number {
  const start = weekStart(today);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (days.has(dayKey(d))) n++;
  }
  return n;
}

/**
 * Consecutive weeks that hit the weekly target, counting back from last week.
 * The current week adds 1 once it hits the target, and never breaks the streak
 * while it's still in progress. Rest days are fine; only missed weeks count.
 */
export function weekStreak(
  days: Set<string>,
  today: Date,
  targetDays: number,
): number {
  let streak = daysThisWeek(days, today) >= targetDays ? 1 : 0;
  const cursor = weekStart(today);
  for (let i = 0; i < 520; i++) {
    cursor.setDate(cursor.getDate() - 7);
    if (daysThisWeek(days, cursor) >= targetDays) streak++;
    else break;
  }
  return streak;
}
