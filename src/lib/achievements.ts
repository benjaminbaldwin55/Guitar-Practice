import { CHORD_PAIRS, unlockedCount } from "@/content/chord-path";
import { PROGRESSIONS } from "@/content/drills";
import { SCALES } from "@/content/scales";
import { STRUMS } from "@/content/strums";
import { goalFor } from "./goals";
import { dayKey, weekStart } from "./streaks";
import type { Measurement, PlayerId, PracticeSession, Settings } from "./types";

/**
 * Achievements are worked out from what's already saved (sessions and
 * measurements), never stored. So they can't drift out of sync, old
 * progress counts automatically, and adding a new one later lights it up
 * for anything you've already done.
 */

export type Owner = PlayerId | "together";

export type Group = "showing-up" | "changes" | "speed" | "explorer" | "together" | "ahead";

export const GROUPS: { id: Group; title: string; blurb: string }[] = [
  { id: "showing-up", title: "Showing up", blurb: "Sessions, hours, and streaks." },
  { id: "changes", title: "Chord changes", blurb: "Unlocking pairs and switching fast." },
  { id: "speed", title: "Speed", blurb: "Clean tempos from the Nailed it button." },
  { id: "explorer", title: "Explorer", blurb: "Trying everything at least once." },
  { id: "together", title: "Together", blurb: "Playing as a duo." },
  { id: "ahead", title: "On the horizon", blurb: "Big goals that open up as the app grows." },
];

export interface History {
  sessions: PracticeSession[]; // oldest first
  measurements: Measurement[]; // oldest first
  settings: Pick<Settings, "weeklyTargetDays" | "minMinutesPerDay">;
}

/** How far along you are. `at` is when the target was first reached. */
export interface Progress {
  value: number;
  at?: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  group: Group;
  /** Short text on the badge: "10", "1h", "60". */
  badge: string;
  target: number;
  /** Who can earn it. Player achievements are earned by Ben and Anna separately. */
  owner: "player" | "together";
  /** Not earnable yet: the feature it needs is still coming. */
  future?: string;
  measure: (h: History, target: number) => Progress;
}

export interface AchievementState {
  def: AchievementDef;
  value: number;
  unlocked: boolean;
  at?: string;
}

// ---------- measuring helpers ----------

/** Value is the count; `at` is the time of the Nth item. */
function nth(times: string[], n: number): Progress {
  const sorted = [...times].sort();
  return { value: sorted.length, at: sorted[n - 1] };
}

function sessionCount(h: History, n: number): Progress {
  return nth(h.sessions.map((s) => s.startedAt), n);
}

function hours(h: History, n: number): Progress {
  let mins = 0;
  let at: string | undefined;
  for (const s of h.sessions) {
    mins += s.minutes;
    if (!at && mins >= n * 60) at = s.endedAt ?? s.startedAt;
  }
  return { value: Math.floor(mins / 60), at };
}

/** Days that counted toward the weekly goal, each with the moment it started counting. */
function countedDays(h: History): { key: string; at: string }[] {
  const byDay = new Map<string, { mins: number; at?: string }>();
  for (const s of h.sessions) {
    const k = dayKey(new Date(s.startedAt));
    const d = byDay.get(k) ?? { mins: 0 };
    d.mins += s.minutes;
    if (!d.at && d.mins >= h.settings.minMinutesPerDay) d.at = s.endedAt ?? s.startedAt;
    byDay.set(k, d);
  }
  return [...byDay.entries()]
    .filter(([, d]) => d.at)
    .map(([key, d]) => ({ key, at: d.at! }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function practiceDaysTotal(h: History, n: number): Progress {
  return nth(countedDays(h).map((d) => d.at), n);
}

/** Longest run of weeks in a row that hit the weekly goal, and when it reached n. */
function weekStreak(h: History, n: number): Progress {
  const weeks = new Map<string, string[]>(); // week start -> times days counted
  for (const d of countedDays(h)) {
    const w = dayKey(weekStart(new Date(`${d.key}T12:00:00`)));
    weeks.set(w, [...(weeks.get(w) ?? []), d.at]);
  }
  const goal = h.settings.weeklyTargetDays;
  const hit = [...weeks.entries()]
    .filter(([, days]) => days.length >= goal)
    .map(([w, days]) => ({ w, at: days.sort()[goal - 1] }))
    .sort((a, b) => a.w.localeCompare(b.w));

  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  let at: string | undefined;
  for (const { w, at: weekAt } of hit) {
    const d = new Date(`${w}T12:00:00`);
    const consecutive = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 7;
    run = consecutive ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
    if (!at && run >= n) at = weekAt;
  }
  return { value: best, at };
}

function changes(h: History): Measurement[] {
  return h.measurements.filter((m) => m.kind === "chord-changes");
}

/** How many chord pairs are open, replaying scores in order. */
function pairsOpen(h: History, n: number): Progress {
  const bests: Record<string, number> = {};
  let at: string | undefined;
  let open = unlockedCount(bests);
  for (const m of changes(h)) {
    bests[m.subject] = Math.max(bests[m.subject] ?? 0, m.value);
    open = unlockedCount(bests);
    if (!at && open >= n) at = m.at;
  }
  return { value: open, at };
}

function bestChange(h: History, n: number): Progress {
  let best = 0;
  let at: string | undefined;
  for (const m of changes(h)) {
    best = Math.max(best, m.value);
    if (!at && best >= n) at = m.at;
  }
  return { value: best, at };
}

/** Number of chord pairs you've switched at 60 a minute. */
function pairsMastered(h: History, n: number): Progress {
  const done = new Map<string, string>();
  for (const m of changes(h)) if (m.value >= 60 && !done.has(m.subject)) done.set(m.subject, m.at);
  return nth([...done.values()], n);
}

function fastestClean(h: History, n: number): Progress {
  let best = 0;
  let at: string | undefined;
  for (const m of h.measurements) {
    if (m.kind !== "clean-bpm") continue;
    best = Math.max(best, m.value);
    if (!at && best >= n) at = m.at;
  }
  return { value: best, at };
}

/** Distinct block refs with a prefix that you've played, e.g. "strum:". */
function distinctRefs(prefix: string) {
  return (h: History, n: number): Progress => {
    const first = new Map<string, string>();
    for (const s of h.sessions)
      for (const b of s.blocks) if (b.ref?.startsWith(prefix) && !first.has(b.ref)) first.set(b.ref, s.startedAt);
    return nth([...first.values()], n);
  };
}

function playedRef(ref: string) {
  return (h: History): Progress => {
    const s = h.sessions.find((x) => x.blocks.some((b) => b.ref === ref));
    return { value: s ? 1 : 0, at: s?.startedAt };
  };
}

function firstMeasurement(kind: Measurement["kind"]) {
  return (h: History): Progress => {
    const m = h.measurements.find((x) => x.kind === kind);
    return { value: m ? 1 : 0, at: m?.at };
  };
}

function sessionAtHour(test: (hour: number) => boolean) {
  return (h: History): Progress => {
    const s = h.sessions.find((x) => test(new Date(x.startedAt).getHours()));
    return { value: s ? 1 : 0, at: s?.startedAt };
  };
}

const notYet = (): Progress => ({ value: 0 });

// ---------- the catalog ----------

type Def = Omit<AchievementDef, "owner"> & { owner?: AchievementDef["owner"] };

function ladder(
  base: { id: string; group: Group; measure: AchievementDef["measure"]; owner?: AchievementDef["owner"] },
  steps: { target: number; title: string; desc: string; badge?: string }[],
): Def[] {
  return steps.map((s) => ({
    id: `${base.id}-${s.target}`,
    group: base.group,
    measure: base.measure,
    owner: base.owner,
    target: s.target,
    title: s.title,
    desc: s.desc,
    badge: s.badge ?? String(s.target),
  }));
}

const CATALOG: Def[] = [
  // Firsts
  { id: "first-session", group: "showing-up", title: "Plugged in", desc: "Finish your first session.", badge: "1", target: 1, measure: sessionCount },
  { id: "first-changes", group: "changes", title: "First count", desc: "Do your first one-minute chord changes.", badge: "1", target: 1, measure: firstMeasurement("chord-changes") },
  { id: "first-nailed", group: "speed", title: "Nailed it", desc: "Tap Nailed it for the first time.", badge: "✓", target: 1, measure: firstMeasurement("clean-bpm") },

  // Sessions
  ...ladder({ id: "sessions", group: "showing-up", measure: sessionCount }, [
    { target: 10, title: "Habit forming", desc: "10 sessions." },
    { target: 25, title: "Regular", desc: "25 sessions." },
    { target: 50, title: "Committed", desc: "50 sessions." },
    { target: 100, title: "Century", desc: "100 sessions." },
    { target: 250, title: "Road dog", desc: "250 sessions." },
    { target: 500, title: "Lifer", desc: "500 sessions." },
    { target: 1000, title: "Thousand club", desc: "1,000 sessions.", badge: "1k" },
  ]),

  // Hours
  ...ladder({ id: "hours", group: "showing-up", measure: hours }, [
    { target: 1, title: "First hour", desc: "1 hour of practice.", badge: "1h" },
    { target: 10, title: "Ten hours", desc: "10 hours of practice.", badge: "10h" },
    { target: 25, title: "Calluses", desc: "25 hours of practice.", badge: "25h" },
    { target: 50, title: "Fifty hours", desc: "50 hours of practice.", badge: "50h" },
    { target: 100, title: "Hundred hours", desc: "100 hours of practice.", badge: "100h" },
    { target: 250, title: "Deep in it", desc: "250 hours of practice.", badge: "250h" },
    { target: 500, title: "Journeyman", desc: "500 hours of practice.", badge: "500h" },
    { target: 1000, title: "Thousand hours", desc: "1,000 hours of practice.", badge: "1kh" },
  ]),

  // Practice days
  ...ladder({ id: "days", group: "showing-up", measure: practiceDaysTotal }, [
    { target: 7, title: "A week's worth", desc: "7 days that counted." },
    { target: 30, title: "A month's worth", desc: "30 days that counted." },
    { target: 100, title: "Hundred days", desc: "100 days that counted." },
    { target: 365, title: "A year's worth", desc: "365 days that counted." },
  ]),

  // Weekly streaks
  ...ladder({ id: "streak", group: "showing-up", measure: weekStreak }, [
    { target: 1, title: "Goal week", desc: "Hit your weekly goal.", badge: "1w" },
    { target: 4, title: "Month strong", desc: "4 goal weeks in a row.", badge: "4w" },
    { target: 12, title: "Quarter strong", desc: "12 goal weeks in a row.", badge: "12w" },
    { target: 26, title: "Half a year", desc: "26 goal weeks in a row.", badge: "26w" },
    { target: 52, title: "Year strong", desc: "52 goal weeks in a row.", badge: "52w" },
  ]),

  // Chord changes
  ...ladder({ id: "pairs-open", group: "changes", measure: pairsOpen }, [
    { target: 3, title: "New pair", desc: "Unlock your first new chord change." },
    { target: 5, title: "Five open", desc: "Five chord changes unlocked." },
    { target: 8, title: "Eight open", desc: "Eight chord changes unlocked." },
    { target: CHORD_PAIRS.length, title: "All open", desc: `All ${CHORD_PAIRS.length} chord changes unlocked.` },
  ]),
  ...ladder({ id: "best-change", group: "changes", measure: bestChange }, [
    { target: 30, title: "Getting quick", desc: "30 changes in a minute on any pair." },
    { target: 40, title: "Smooth", desc: "40 changes in a minute on any pair." },
    { target: 50, title: "Slick", desc: "50 changes in a minute on any pair." },
    { target: 60, title: "One a second", desc: "60 changes in a minute. Song-ready." },
  ]),
  { id: "switch-master", group: "changes", title: "Switch master", desc: `60 a minute on all ${CHORD_PAIRS.length} chord changes.`, badge: "★", target: CHORD_PAIRS.length, measure: pairsMastered },

  // Speed
  ...ladder({ id: "clean-bpm", group: "speed", measure: fastestClean }, [
    { target: 100, title: "Triple digits", desc: "Nail any drill at 100 BPM." },
    { target: 120, title: "Rock tempo", desc: "Nail any drill at 120 BPM." },
    { target: 140, title: "Punk tempo", desc: "Nail any drill at 140 BPM." },
    { target: 160, title: "Shred tempo", desc: "Nail any drill at 160 BPM." },
  ]),

  // Explorer
  { id: "all-strums", group: "explorer", title: "Every strum", desc: `Play all ${STRUMS.length} strum patterns.`, badge: "↓↑", target: STRUMS.length, measure: distinctRefs("strum:") },
  { id: "all-scales", group: "explorer", title: "Both boxes", desc: "Play both pentatonic shapes.", badge: "□", target: Object.keys(SCALES).length, measure: distinctRefs("scale:") },
  { id: "all-progressions", group: "explorer", title: "Progression tour", desc: `Play all ${PROGRESSIONS.length} progressions.`, badge: "→", target: PROGRESSIONS.length, measure: distinctRefs("progression:") },
  { id: "twelve-bar", group: "explorer", title: "Twelve bars", desc: "Play the 12-bar blues in A.", badge: "12", target: 1, measure: playedRef("progression:blues-12-a") },
  { id: "fun-sampler", group: "explorer", title: "Fun sampler", desc: "Try six different fun finishers.", badge: "6", target: 6, measure: distinctRefs("fun:") },
  { id: "early", group: "explorer", title: "Early riser", desc: "Start a session before 8am.", badge: "AM", target: 1, measure: sessionAtHour((h) => h < 8) },
  { id: "late", group: "explorer", title: "Night owl", desc: "Start a session after 10pm.", badge: "PM", target: 1, measure: sessionAtHour((h) => h >= 22) },

  // Together
  ...ladder({ id: "duo-sessions", group: "together", measure: sessionCount, owner: "together" }, [
    { target: 1, title: "First jam", desc: "Your first session together." },
    { target: 10, title: "Duo", desc: "10 sessions together." },
    { target: 50, title: "Band practice", desc: "50 sessions together." },
    { target: 100, title: "Tight band", desc: "100 sessions together." },
  ]),
  ...ladder({ id: "duo-hours", group: "together", measure: hours, owner: "together" }, [
    { target: 10, title: "Ten hours together", desc: "10 hours of playing together.", badge: "10h" },
    { target: 50, title: "Fifty hours together", desc: "50 hours of playing together.", badge: "50h" },
  ]),
  { id: "duo-streak", group: "together", owner: "together", title: "Duo week", desc: "Play together on enough days to hit the weekly goal.", badge: "1w", target: 1, measure: weekStreak },

  // On the horizon: shown locked so the long road is visible.
  { id: "first-lick", group: "ahead", title: "First lick", desc: "Learn a lick and nail it at tempo.", badge: "~", target: 1, future: "Arrives with the lead track", measure: notYet },
  { id: "in-tune-bend", group: "ahead", title: "In-tune bend", desc: "Three bends that land within 10 cents of the target.", badge: "↗", target: 1, future: "Arrives with the lead track", measure: notYet },
  { id: "echo", group: "ahead", title: "Echo", desc: "Play back 10 call-and-response phrases correctly.", badge: "10", target: 1, future: "Arrives with call and response", measure: notYet },
  { id: "five-boxes", group: "ahead", title: "All five boxes", desc: "Play every pentatonic box, connected.", badge: "5", target: 1, future: "Arrives with the lead track", measure: notYet },
  { id: "first-song", group: "ahead", title: "First full song", desc: "Play a whole song start to finish.", badge: "♪", target: 1, future: "Arrives with Songs", measure: notYet },
  { id: "first-barre", group: "ahead", title: "Barre none", desc: "Play a clean F barre chord.", badge: "F", target: 1, future: "Arrives with barre chords", measure: notYet },
  { id: "by-ear", group: "ahead", title: "By ear", desc: "Figure out a riff by ear.", badge: "♫", target: 1, future: "Arrives with ear training", measure: notYet },
  { id: "first-solo", group: "ahead", title: "Lead guitar", desc: "Play a full solo.", badge: "⚡", target: 1, future: "Arrives with lead lessons", measure: notYet },
  { id: "sals", group: "ahead", title: "Stay a Little Longer", desc: "The whole thing, solo included. Ben's big goal.", badge: "★", target: 1, future: "Arrives with Songs", measure: notYet },
];

export const ACHIEVEMENTS: AchievementDef[] = CATALOG.map((d) => ({ ...d, owner: d.owner ?? "player" }));

/** Sessions and measurements that belong to an owner, oldest first. */
export function historyFor(
  owner: Owner,
  sessions: PracticeSession[],
  measurements: Measurement[],
  appSettings: History["settings"] & Partial<Pick<Settings, "goals">>,
): History {
  // Each owner's streaks are measured against their own weekly goal.
  const settings = {
    minMinutesPerDay: appSettings.minMinutesPerDay,
    weeklyTargetDays: goalFor(appSettings, owner === "together" ? "both" : owner),
  };
  const ss = sessions
    .filter((s) => (owner === "together" ? s.players.length > 1 : s.players.includes(owner)))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const ids = new Set(ss.map((s) => s.id));
  const ms = measurements
    .filter((m) => (owner === "together" ? !!m.sessionId && ids.has(m.sessionId) : m.playerId === owner))
    .sort((a, b) => a.at.localeCompare(b.at));
  return { sessions: ss, measurements: ms, settings };
}

export function evaluate(owner: Owner, h: History): AchievementState[] {
  return ACHIEVEMENTS.filter((a) => (owner === "together" ? a.owner === "together" : a.owner === "player")).map(
    (def) => {
      const p = def.future ? { value: 0 } : def.measure(h, def.target);
      const unlocked = !def.future && p.value >= def.target;
      return { def, value: Math.min(p.value, def.target), unlocked, at: unlocked ? p.at : undefined };
    },
  );
}

/** Ids unlocked in `after` that weren't in `before`. */
export function newlyUnlocked(before: AchievementState[], after: AchievementState[]): AchievementState[] {
  const had = new Set(before.filter((a) => a.unlocked).map((a) => a.def.id));
  return after.filter((a) => a.unlocked && !had.has(a.def.id));
}

/** Locked achievements closest to done, for "almost there" nudges. */
export function closest(states: AchievementState[], n = 3): AchievementState[] {
  return states
    .filter((s) => !s.unlocked && !s.def.future && s.value > 0)
    .sort((a, b) => b.value / b.def.target - a.value / a.def.target)
    .slice(0, n);
}

