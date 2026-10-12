import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, closest, evaluate, historyFor, newlyUnlocked } from "./achievements";
import type { Measurement, PlayerId, PracticeSession } from "./types";

const settings = { weeklyTargetDays: 5, minMinutesPerDay: 10 };

function sess(day: string, players: PlayerId[], minutes = 25, refs: string[] = [], hour = 18): PracticeSession {
  const start = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
  return {
    id: `${day}-${players.join()}-${hour}`,
    players,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + minutes * 60000).toISOString(),
    minutes,
    blocks: refs.map((ref) => ({ kind: "due", title: ref, plannedMin: 5, done: true, ref })),
  };
}

function weekdays(monday: string, players: PlayerId[] = ["ben"]): PracticeSession[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(`${monday}T12:00:00`);
    d.setDate(d.getDate() + i);
    return sess(d.toISOString().slice(0, 10), players);
  });
}

const m = (subject: string, value: number, at: string, kind: Measurement["kind"] = "chord-changes", playerId: PlayerId = "ben"): Measurement => ({
  id: `${subject}-${value}-${at}`,
  playerId,
  kind,
  subject,
  value,
  at,
});

const get = (states: ReturnType<typeof evaluate>, id: string) => states.find((s) => s.def.id === id)!;

describe("achievements", () => {
  it("has unique ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("starts with nothing unlocked", () => {
    const st = evaluate("ben", historyFor("ben", [], [], settings));
    expect(st.filter((s) => s.unlocked)).toHaveLength(0);
  });

  it("counts sessions and remembers when the target was hit", () => {
    const ss = Array.from({ length: 12 }, (_, i) => sess(`2026-10-${String(i + 1).padStart(2, "0")}`, ["ben"]));
    const st = evaluate("ben", historyFor("ben", ss, [], settings));
    expect(get(st, "first-session").unlocked).toBe(true);
    expect(get(st, "sessions-10").unlocked).toBe(true);
    expect(get(st, "sessions-10").at).toBe(ss[9].startedAt);
    expect(get(st, "sessions-25").value).toBe(12);
  });

  it("tracks goal weeks in a row", () => {
    const ss = [...weekdays("2026-09-21"), ...weekdays("2026-09-28"), ...weekdays("2026-10-05"), ...weekdays("2026-10-12")];
    const st = evaluate("ben", historyFor("ben", ss, [], settings));
    expect(get(st, "streak-4").unlocked).toBe(true);
    expect(get(st, "streak-12").value).toBe(4);
  });

  it("a missed week resets the run", () => {
    const ss = [...weekdays("2026-09-21"), ...weekdays("2026-10-05"), ...weekdays("2026-10-12")];
    expect(get(evaluate("ben", historyFor("ben", ss, [], settings)), "streak-4").value).toBe(2);
  });

  it("follows chord unlocks and speed", () => {
    const ms = [m("Em-Am", 22, "2026-10-01T10:00:00Z"), m("Em-G", 31, "2026-10-02T10:00:00Z"), m("Am-C", 20, "2026-10-03T10:00:00Z")];
    const st = evaluate("ben", historyFor("ben", [], ms, settings));
    expect(get(st, "first-changes").unlocked).toBe(true);
    expect(get(st, "pairs-open-3").at).toBe("2026-10-01T10:00:00Z");
    expect(get(st, "pairs-open-5").unlocked).toBe(true);
    expect(get(st, "best-change-30").unlocked).toBe(true);
    expect(get(st, "best-change-40").unlocked).toBe(false);
  });

  it("keeps Ben's and Anna's progress separate", () => {
    const ms = [m("Em-Am", 45, "2026-10-01T10:00:00Z", "chord-changes", "anna")];
    expect(get(evaluate("ben", historyFor("ben", [], ms, settings)), "best-change-40").unlocked).toBe(false);
    expect(get(evaluate("anna", historyFor("anna", [], ms, settings)), "best-change-40").unlocked).toBe(true);
  });

  it("together achievements only count sessions played together", () => {
    const ss = [sess("2026-10-01", ["ben"]), sess("2026-10-02", ["ben", "anna"])];
    const st = evaluate("together", historyFor("together", ss, [], settings));
    expect(get(st, "duo-sessions-1").unlocked).toBe(true);
    expect(get(st, "duo-sessions-10").value).toBe(1);
    expect(st.every((s) => s.def.owner === "together")).toBe(true);
  });

  it("explorer badges count distinct things played", () => {
    const ss = [sess("2026-10-01", ["ben"], 25, ["progression:blues-12-a", "strum:quarters"], 7)];
    const st = evaluate("ben", historyFor("ben", ss, [], settings));
    expect(get(st, "twelve-bar").unlocked).toBe(true);
    expect(get(st, "early").unlocked).toBe(true);
    expect(get(st, "all-strums").value).toBe(1);
  });

  it("future goals stay locked", () => {
    const st = evaluate("ben", historyFor("ben", [sess("2026-10-01", ["ben"])], [], settings));
    expect(get(st, "sals").unlocked).toBe(false);
  });

  it("reports what a session just unlocked, and what's close", () => {
    const before = evaluate("ben", historyFor("ben", [], [], settings));
    const after = evaluate("ben", historyFor("ben", [sess("2026-10-01", ["ben"], 70)], [m("Em-Am", 25, "2026-10-01T19:00:00Z")], settings));
    const ids = newlyUnlocked(before, after).map((a) => a.def.id);
    expect(ids).toEqual(expect.arrayContaining(["first-session", "hours-1", "first-changes", "pairs-open-3"]));
    expect(closest(after)[0].value).toBeGreaterThan(0);
  });
});
