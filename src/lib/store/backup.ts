import type {
  Measurement,
  PracticeSession,
  Recording,
  Settings,
} from "../types";
import type { Store } from "./store";

export const BACKUP_FORMAT = "guitar-practice-backup";
export const BACKUP_VERSION = 1;

type RecordingJson = Omit<Recording, "blob"> & { dataBase64: string };

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  settings: Settings;
  sessions: PracticeSession[];
  measurements: Measurement[];
  recordings: RecordingJson[];
}

export interface ImportResult {
  sessions: number;
  measurements: number;
  recordings: number;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function exportBackup(store: Store): Promise<Backup> {
  const [settings, sessions, measurements, recordings] = await Promise.all([
    store.getSettings(),
    store.listSessions(),
    store.listMeasurements(),
    store.listRecordings(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    sessions,
    measurements,
    recordings: await Promise.all(
      recordings.map(async ({ blob, ...rest }) => ({
        ...rest,
        dataBase64: await blobToBase64(blob),
      })),
    ),
  };
}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON. Pick a backup exported from this app.");
  }
  const b = data as Partial<Backup>;
  if (b?.format !== BACKUP_FORMAT) {
    throw new Error("That file isn't a guitar practice backup.");
  }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    throw new Error("This backup comes from a newer version of the app. Update the app, then try again.");
  }
  if (
    !Array.isArray(b.sessions) ||
    !Array.isArray(b.measurements) ||
    !Array.isArray(b.recordings)
  ) {
    throw new Error("This backup is missing data and can't be restored.");
  }
  return b as Backup;
}

/**
 * "merge" keeps existing data and adds or overwrites by id.
 * "replace" wipes everything first.
 */
export async function importBackup(
  store: Store,
  backup: Backup,
  mode: "merge" | "replace",
): Promise<ImportResult> {
  if (mode === "replace") await store.clearAll();
  if (backup.settings) await store.updateSettings(backup.settings);
  for (const s of backup.sessions) await store.putSession(s);
  for (const m of backup.measurements) await store.putMeasurement(m);
  for (const { dataBase64, ...rest } of backup.recordings) {
    await store.putRecording({
      ...rest,
      blob: base64ToBlob(dataBase64, rest.mimeType),
    });
  }
  return {
    sessions: backup.sessions.length,
    measurements: backup.measurements.length,
    recordings: backup.recordings.length,
  };
}
