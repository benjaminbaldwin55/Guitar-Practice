import type {
  Measurement,
  PlayerId,
  PracticeSession,
  Recording,
  Settings,
} from "../types";

/**
 * Everything the app saves goes through this interface.
 * Today it's backed by IndexedDB in the browser. When we host, a synced
 * implementation can slot in here without touching the UI.
 */
export interface Store {
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  listSessions(): Promise<PracticeSession[]>;
  putSession(s: PracticeSession): Promise<void>;
  deleteSession(id: string): Promise<void>;

  listMeasurements(filter?: {
    playerId?: PlayerId;
    kind?: Measurement["kind"];
    subject?: string;
  }): Promise<Measurement[]>;
  putMeasurement(m: Measurement): Promise<void>;

  listRecordings(): Promise<Recording[]>;
  putRecording(r: Recording): Promise<void>;
  deleteRecording(id: string): Promise<void>;

  /** Wipes all data. Only used by backup restore in "replace" mode. */
  clearAll(): Promise<void>;
}
