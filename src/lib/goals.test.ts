import { describe, expect, it } from "vitest";
import { songsFor } from "@/content/song-ideas";
import { evaluate, historyFor } from "./achievements";
import { goalFor, isQuiet } from "./goals";
import { DEFAULT_SETTINGS, type PlayerId, type PracticeSession } from "./types";

function week(monday: string, days: number, players: PlayerId[]): PracticeSession[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(`${monday}T18:00:00`);
    d.setDate(d.getDate() + i);
    return { id: `${monday}-${i}-${players.join()}`, players, startedAt: d.toISOString(), minutes: 30, blocks: [] };
  });
}

describe("per-player goals", () => {
  it("defaults: Ben 5, Anna 4, together 2, Anna's stats quiet", () => {
    expect(goalFor(DEFAULT_SETTINGS, "ben")).toBe(5);
    expect(goalFor(DEFAULT_SETTINGS, "anna")).toBe(4);
    expect(goalFor(DEFAULT_SETTINGS, "both")).toBe(2);
    expect(isQuiet(DEFAULT_SETTINGS, "anna")).toBe(true);
    expect(isQuiet(DEFAULT_SETTINGS, "ben")).toBe(false);
  });

  it("measures each person's goal weeks against their own goal", () => {
    const ss = week("2026-10-05", 4, ["anna"]);
    const get = (who: "anna" | "ben") =>
      evaluate(who, historyFor(who, [...ss, ...week("2026-10-05", 4, ["ben"])], [], DEFAULT_SETTINGS)).find((a) => a.def.id === "streak-1")!;
    expect(get("anna").unlocked).toBe(true); // 4 of 4
    expect(get("ben").unlocked).toBe(false); // 4 of 5
  });
});

describe("song ideas", () => {
  it("gives each person their own taste, and duo picks together", () => {
    expect(songsFor("anna").map((s) => s.title)).toContain("Moon Song");
    expect(songsFor("anna").map((s) => s.title)).not.toContain("Rooster");
    expect(songsFor("ben").map((s) => s.title)).not.toContain("Moon Song");
    expect(songsFor("both").map((s) => s.title)).toEqual(expect.arrayContaining(["The Night We Met", "Yellow"]));
  });
});
