import { describe, expect, it } from "vitest";
import {
  dayKey,
  daysThisWeek,
  practiceDays,
  weekStart,
  weekStreak,
} from "./streaks";
import type { PracticeSession } from "./types";

function session(date: string, minutes: number, players = ["ben"]) {
  return {
    id: date + minutes + players.join(),
    players,
    startedAt: new Date(`${date}T18:00:00`).toISOString(),
    minutes,
    blocks: [],
  } as PracticeSession;
}

// Weekdays of a given week, Mon..Fri. 2026-10-12 is a Monday.
function weekdays(monday: string, count = 5): PracticeSession[] {
  const start = new Date(`${monday}T12:00:00`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return session(dayKey(d), 25);
  });
}

describe("weekStart", () => {
  it("returns Monday for any day of the week", () => {
    expect(dayKey(weekStart(new Date("2026-10-12T09:00:00")))).toBe("2026-10-12");
    expect(dayKey(weekStart(new Date("2026-10-18T23:00:00")))).toBe("2026-10-12");
    expect(dayKey(weekStart(new Date("2026-10-19T00:30:00")))).toBe("2026-10-19");
  });
});

describe("practiceDays", () => {
  it("adds up short sessions on the same day", () => {
    const days = practiceDays(
      [session("2026-10-12", 6), session("2026-10-12", 6), session("2026-10-13", 6)],
      "ben",
      10,
    );
    expect([...days]).toEqual(["2026-10-12"]);
  });

  it("counts together sessions for both players", () => {
    const s = [session("2026-10-12", 20, ["ben", "anna"])];
    expect(practiceDays(s, "anna", 10).size).toBe(1);
    expect(practiceDays([session("2026-10-12", 20)], "anna", 10).size).toBe(0);
  });
});

describe("weekStreak", () => {
  const today = new Date("2026-10-14T20:00:00"); // Wednesday

  it("doesn't break while the current week is still in progress", () => {
    const days = practiceDays(
      [...weekdays("2026-09-28"), ...weekdays("2026-10-05")],
      "ben",
      10,
    );
    expect(daysThisWeek(days, today)).toBe(0);
    expect(weekStreak(days, today, 5)).toBe(2);
  });

  it("counts the current week once it hits the target", () => {
    const days = practiceDays(
      [...weekdays("2026-10-05"), ...weekdays("2026-10-12")],
      "ben",
      10,
    );
    expect(weekStreak(days, new Date("2026-10-16T21:00:00"), 5)).toBe(2);
  });

  it("stops at a missed week", () => {
    const days = practiceDays(
      [...weekdays("2026-09-21"), ...weekdays("2026-09-28", 3), ...weekdays("2026-10-05")],
      "ben",
      10,
    );
    expect(weekStreak(days, today, 5)).toBe(1);
  });
});
