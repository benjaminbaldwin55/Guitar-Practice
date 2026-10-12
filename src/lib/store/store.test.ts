import { describe, expect, it } from "vitest";
import { IdbStore } from "./idb-store";
import { exportBackup, importBackup, parseBackup } from "./backup";
import type { Measurement, PracticeSession } from "../types";

let n = 0;
const fresh = () => new IdbStore(`test-${++n}`);

const sess: PracticeSession = {
  id: "s1",
  players: ["ben", "anna"],
  startedAt: "2026-10-12T18:00:00.000Z",
  minutes: 25,
  feel: "good",
  blocks: [{ kind: "warmup", title: "Wrist stretches", plannedMin: 4, done: true }],
};

const meas: Measurement = {
  id: "m1",
  playerId: "ben",
  kind: "chord-changes",
  subject: "Em-G",
  value: 22,
  at: "2026-10-12T18:10:00.000Z",
};

describe("IdbStore", () => {
  it("returns default settings and merges updates", async () => {
    const s = fresh();
    expect((await s.getSettings()).weeklyTargetDays).toBe(5);
    await s.updateSettings({ activeWho: "both" });
    const got = await s.getSettings();
    expect(got.activeWho).toBe("both");
    expect(got.weeklyTargetDays).toBe(5);
  });

  it("filters measurements by player, kind and subject", async () => {
    const s = fresh();
    await s.putMeasurement(meas);
    await s.putMeasurement({ ...meas, id: "m2", subject: "Am-C", value: 15 });
    await s.putMeasurement({ ...meas, id: "m3", playerId: "anna" });
    const r = await s.listMeasurements({ playerId: "ben", kind: "chord-changes", subject: "Em-G" });
    expect(r.map((m) => m.id)).toEqual(["m1"]);
    expect(await s.listMeasurements({ playerId: "ben" })).toHaveLength(2);
  });
});

describe("backup", () => {
  it("round-trips everything, recordings included", async () => {
    const a = fresh();
    await a.updateSettings({ activeWho: "ben" });
    await a.putSession(sess);
    await a.putMeasurement(meas);
    const audio = new Uint8Array([1, 2, 3, 250, 255]);
    await a.putRecording({
      id: "r1",
      players: ["ben"],
      subject: "Em-G strum",
      at: "2026-10-12T18:20:00.000Z",
      durationSec: 30,
      mimeType: "audio/webm",
      blob: new Blob([audio], { type: "audio/webm" }),
    });

    const text = JSON.stringify(await exportBackup(a));
    const b = fresh();
    await b.putSession({ ...sess, id: "keep-me" });
    const res = await importBackup(b, parseBackup(text), "merge");

    expect(res).toEqual({ sessions: 1, measurements: 1, recordings: 1 });
    expect((await b.listSessions()).map((s) => s.id).sort()).toEqual(["keep-me", "s1"]);
    expect((await b.getSettings()).activeWho).toBe("ben");
    const [rec] = await b.listRecordings();
    expect(new Uint8Array(await rec.blob.arrayBuffer())).toEqual(audio);
  });

  it("replace mode wipes existing data first", async () => {
    const a = fresh();
    await a.putSession(sess);
    const backup = await exportBackup(a);
    const b = fresh();
    await b.putSession({ ...sess, id: "old" });
    await importBackup(b, backup, "replace");
    expect((await b.listSessions()).map((s) => s.id)).toEqual(["s1"]);
  });

  it("rejects files that aren't backups", () => {
    expect(() => parseBackup("nope")).toThrow(/valid JSON/);
    expect(() => parseBackup('{"format":"other"}')).toThrow(/isn't a guitar practice backup/);
    expect(() =>
      parseBackup(JSON.stringify({ format: "guitar-practice-backup", version: 99 })),
    ).toThrow(/newer version/);
  });
});
