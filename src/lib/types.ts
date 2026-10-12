export type PlayerId = "ben" | "anna";

/** Who a session or song belongs to. "both" means Together mode. */
export type Who = PlayerId | "both";

export type Feel = "rough" | "ok" | "good" | "great";

export type BlockKind = "warmup" | "due" | "edge" | "song" | "fun" | "break";

export interface SessionBlock {
  kind: BlockKind;
  title: string;
  plannedMin: number;
  done: boolean;
  /** What the block was, e.g. "changes:Em-G" or "strum:campfire". Used to vary future sessions. */
  ref?: string;
}

export type Energy = "low" | "normal" | "high";

export interface PracticeSession {
  id: string;
  players: PlayerId[];
  startedAt: string; // ISO
  endedAt?: string; // ISO
  minutes: number;
  feel?: Feel;
  /** Answer to "anything hurt?" at the end of a session. */
  pain?: boolean;
  blocks: SessionBlock[];
}

export type MeasurementKind =
  | "chord-changes" // clean switches in 60s, subject like "Em-G"
  | "clean-bpm" // highest clean tempo, subject is a drill or riff id
  | "tempo" // one block's tempo run: value = fastest nailed, meta.start = where it began
  | "note-accuracy" // percent, from pitch detection
  | "ear"; // percent correct

export interface Measurement {
  id: string;
  playerId: PlayerId;
  kind: MeasurementKind;
  subject: string;
  value: number;
  at: string; // ISO
  sessionId?: string;
  meta?: Record<string, number>;
}

export interface Recording {
  id: string;
  players: PlayerId[];
  subject: string;
  at: string; // ISO
  durationSec: number;
  mimeType: string;
  blob: Blob;
}

export interface Settings {
  activeWho: Who | null;
  weeklyTargetDays: number;
  /** A day counts toward the weekly goal once a player hits this many minutes. */
  minMinutesPerDay: number;
  maxSessionMin: number;
  /** Tunings in the tuner's list, most recently used first. */
  tunings: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  activeWho: null,
  weeklyTargetDays: 5,
  minMinutesPerDay: 10,
  maxSessionMin: 40,
  tunings: ["standard", "drop-d", "eb"],
};
