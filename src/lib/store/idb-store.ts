import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DEFAULT_SETTINGS,
  type Measurement,
  type PracticeSession,
  type Recording,
  type Settings,
} from "../types";
import type { Store } from "./store";

const DB_NAME = "guitar-practice";
const DB_VERSION = 1;

interface Schema extends DBSchema {
  settings: { key: string; value: Settings };
  sessions: {
    key: string;
    value: PracticeSession;
    indexes: { startedAt: string };
  };
  measurements: {
    key: string;
    value: Measurement;
    indexes: { byPlayerKind: [string, string]; at: string };
  };
  recordings: { key: string; value: Recording; indexes: { at: string } };
}

const SETTINGS_KEY = "app";

export class IdbStore implements Store {
  private dbp: Promise<IDBPDatabase<Schema>>;

  constructor(name = DB_NAME) {
    this.dbp = openDB<Schema>(name, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("settings");
        db.createObjectStore("sessions", { keyPath: "id" }).createIndex(
          "startedAt",
          "startedAt",
        );
        const m = db.createObjectStore("measurements", { keyPath: "id" });
        m.createIndex("byPlayerKind", ["playerId", "kind"]);
        m.createIndex("at", "at");
        db.createObjectStore("recordings", { keyPath: "id" }).createIndex(
          "at",
          "at",
        );
      },
    });
  }

  async getSettings(): Promise<Settings> {
    const db = await this.dbp;
    const s = await db.get("settings", SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...s };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch };
    await (await this.dbp).put("settings", next, SETTINGS_KEY);
    return next;
  }

  async listSessions(): Promise<PracticeSession[]> {
    return (await this.dbp).getAllFromIndex("sessions", "startedAt");
  }

  async putSession(s: PracticeSession): Promise<void> {
    await (await this.dbp).put("sessions", s);
  }

  async deleteSession(id: string): Promise<void> {
    await (await this.dbp).delete("sessions", id);
  }

  async listMeasurements(
    filter: Parameters<Store["listMeasurements"]>[0] = {},
  ): Promise<Measurement[]> {
    const db = await this.dbp;
    const all =
      filter.playerId && filter.kind
        ? await db.getAllFromIndex("measurements", "byPlayerKind", [
            filter.playerId,
            filter.kind,
          ])
        : await db.getAllFromIndex("measurements", "at");
    return all
      .filter(
        (m) =>
          (!filter.playerId || m.playerId === filter.playerId) &&
          (!filter.kind || m.kind === filter.kind) &&
          (!filter.subject || m.subject === filter.subject),
      )
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async putMeasurement(m: Measurement): Promise<void> {
    await (await this.dbp).put("measurements", m);
  }

  async listRecordings(): Promise<Recording[]> {
    return (await this.dbp).getAllFromIndex("recordings", "at");
  }

  async putRecording(r: Recording): Promise<void> {
    await (await this.dbp).put("recordings", r);
  }

  async deleteRecording(id: string): Promise<void> {
    await (await this.dbp).delete("recordings", id);
  }

  async clearAll(): Promise<void> {
    const db = await this.dbp;
    const tx = db.transaction(
      ["settings", "sessions", "measurements", "recordings"],
      "readwrite",
    );
    await Promise.all([
      tx.objectStore("settings").clear(),
      tx.objectStore("sessions").clear(),
      tx.objectStore("measurements").clear(),
      tx.objectStore("recordings").clear(),
      tx.done,
    ]);
  }
}
