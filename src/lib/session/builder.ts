import {
  knownChords,
  nextMilestone,
  pairId,
  unlockedPairs,
} from "@/content/chord-path";
import { FUN, PROGRESSIONS, type FunIdea, type Progression } from "@/content/drills";
import { SCALES } from "@/content/scales";
import { STRUMS } from "@/content/strums";
import { WARMUPS, type WarmupStep } from "@/content/warmups";
import type { Energy, PlayerId, SessionBlock } from "../types";
import { pick, rng, shuffle } from "./rng";

export type Payload =
  | { type: "warmup"; steps: WarmupStep[] }
  | { type: "changes"; pair: [string, string]; best: number | null; goal: number | null }
  | { type: "strum"; patternId: string; chords: string[]; bpm: number }
  | { type: "scale"; scaleId: string; bpm: number; exercise: string }
  | { type: "progression"; prog: Progression; bpm: number }
  | { type: "fun"; idea: FunIdea }
  | { type: "break" };

export interface PlannedBlock extends SessionBlock {
  payload: Payload;
}

export type SessionLength = 10 | 20 | 30;

export interface BuildInput {
  players: PlayerId[];
  minutes: SessionLength;
  energy: Energy;
  /** Best changes-per-minute per player, keyed by pair id like "Em-G". */
  bests: Partial<Record<PlayerId, Record<string, number>>>;
  /** Block refs from recent sessions, most recent first. */
  recentRefs: string[];
  seed: number;
}

const SCALE_EXERCISES = [
  "Up and back down, one note per click. Say the root note out loud when you hit it.",
  "Up and down in eighth notes: two notes per click. Only speed up when it's clean.",
  "Start on the lowest root, climb to the next root, and come back. Then the next pair of roots.",
  "Play each string's two notes four times before moving to the next string. Alternate pick: down, up, down, up.",
];

/**
 * Shared bests for a group: the lower score for each pair, so a together
 * session works on whatever's weakest for either of you.
 */
export function groupBests(
  players: PlayerId[],
  bests: BuildInput["bests"],
): Record<string, number> {
  const ids = new Set(players.flatMap((p) => Object.keys(bests[p] ?? {})));
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = Math.min(...players.map((p) => bests[p]?.[id] ?? 0));
  }
  return out;
}

/** Higher means longer ago. Never-done counts as the longest ago. */
function staleness(recent: string[], match: (ref: string) => boolean): number {
  const i = recent.findIndex(match);
  return i === -1 ? Infinity : i;
}

function leastRecent<T>(
  rand: () => number,
  items: T[],
  recent: string[],
  refOf: (t: T) => string,
): T {
  const scored = shuffle(rand, items).map((t) => ({
    t,
    s: staleness(recent, (r) => r === refOf(t)),
  }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0].t;
}

const subset = (need: string[] | undefined, have: string[]) =>
  !need || need.every((c) => have.includes(c));

export function buildSession(input: BuildInput): PlannedBlock[] {
  const { players, minutes, energy, recentRefs } = input;
  const rand = rng(input.seed);
  const together = players.length > 1;
  const bests = groupBests(players, input.bests);
  const pairs = unlockedPairs(bests);
  const known = knownChords(bests);
  const blocks: PlannedBlock[] = [];

  // Time budget per block. The fun block soaks up whatever is left.
  const plan =
    minutes === 10
      ? { warm: 3, edge: 3, due: [] as number[] }
      : minutes === 20
        ? { warm: 4, edge: 5, due: [6] }
        : { warm: 4, edge: 6, due: [6, 7] };
  if (energy === "low") plan.edge = Math.max(3, plan.edge - 1);
  if (energy === "high" && plan.due.length) plan.due[0] += 1;

  // 1. Warm-up: two stretches and one finger drill, rotated.
  const stretches = WARMUPS.filter((w) => w.kind === "stretch");
  const fingers = WARMUPS.filter((w) => w.kind === "fingers");
  const recentWarm = recentRefs.filter((r) => r.startsWith("warmup:")).slice(0, 2).join("+");
  const s1 = shuffle(rand, stretches).sort(
    (a, b) => Number(recentWarm.includes(a.id)) - Number(recentWarm.includes(b.id)),
  );
  const f1 = shuffle(rand, fingers).sort(
    (a, b) => Number(recentWarm.includes(a.id)) - Number(recentWarm.includes(b.id)),
  );
  const steps = [s1[0], s1[1], f1[0]];
  blocks.push({
    kind: "warmup",
    title: "Warm-up",
    plannedMin: plan.warm,
    done: false,
    ref: `warmup:${steps.map((s) => s.id).join("+")}`,
    payload: { type: "warmup", steps },
  });

  // 2. Edge: the weakest open chord change, measured.
  const edgePair = [...shuffle(rand, pairs)].sort((a, b) => {
    const d = (bests[pairId(a)] ?? 0) - (bests[pairId(b)] ?? 0);
    if (d !== 0) return d;
    return (
      staleness(recentRefs, (r) => r === `changes:${pairId(b)}`) -
      staleness(recentRefs, (r) => r === `changes:${pairId(a)}`)
    );
  })[0];
  const best = bests[pairId(edgePair)] ?? null;
  blocks.push({
    kind: "edge",
    title: `${edgePair[0]} to ${edgePair[1]} changes`,
    plannedMin: plan.edge,
    done: false,
    ref: `changes:${pairId(edgePair)}`,
    payload: {
      type: "changes",
      pair: edgePair,
      best: best || null,
      goal: nextMilestone(best || null),
    },
  });

  // 3. Due: rotate between strumming, scales and progressions.
  type Cat = "strum" | "scale" | "progression";
  const progs = PROGRESSIONS.filter((p) => subset(p.chords, known));
  const cats: Cat[] = ["strum", "scale", ...(progs.length ? (["progression"] as Cat[]) : [])];
  const catOrder = shuffle(rand, cats).sort(
    (a, b) =>
      staleness(recentRefs, (r) => r.startsWith(`${b}:`)) -
      staleness(recentRefs, (r) => r.startsWith(`${a}:`)),
  );

  plan.due.forEach((mins, i) => {
    if (i > 0) {
      blocks.push({
        kind: "break",
        title: "Shake it out",
        plannedMin: 1,
        done: false,
        ref: "break",
        payload: { type: "break" },
      });
    }
    const cat = catOrder[i % catOrder.length];
    const bump = energy === "high" ? 10 : energy === "low" ? -5 : 0;

    if (cat === "strum") {
      const maxLevel = energy === "low" ? 1 : pairs.length >= 4 ? 2 : 1;
      const pattern = leastRecent(
        rand,
        STRUMS.filter((s) => s.level <= maxLevel),
        recentRefs,
        (s) => `strum:${s.id}`,
      );
      const chords = pick(rand, pairs);
      blocks.push({
        kind: "due",
        title: pattern.name,
        plannedMin: mins,
        done: false,
        ref: `strum:${pattern.id}`,
        payload: { type: "strum", patternId: pattern.id, chords: [...chords], bpm: pattern.startBpm + bump },
      });
    } else if (cat === "scale") {
      const scale = leastRecent(rand, Object.values(SCALES), recentRefs, (s) => `scale:${s.id}`);
      blocks.push({
        kind: "due",
        title: scale.name,
        plannedMin: mins,
        done: false,
        ref: `scale:${scale.id}`,
        payload: {
          type: "scale",
          scaleId: scale.id,
          bpm: 60 + bump,
          exercise: pick(rand, SCALE_EXERCISES),
        },
      });
    } else {
      const prog = leastRecent(rand, progs, recentRefs, (p) => `progression:${p.id}`);
      blocks.push({
        kind: "due",
        title: prog.name,
        plannedMin: mins,
        done: false,
        ref: `progression:${prog.id}`,
        payload: { type: "progression", prog, bpm: prog.bpm + bump },
      });
    }
  });

  // 4. Fun: always last, always something you'd want to do anyway.
  let ideas = FUN.filter(
    (f) =>
      subset(f.needs, known) &&
      (together ? !f.solo : !f.together),
  );
  if (energy === "low" && ideas.some((f) => f.chill)) ideas = ideas.filter((f) => f.chill);
  const idea = leastRecent(rand, ideas, recentRefs, (f) => `fun:${f.id}`);
  const used = blocks.reduce((n, b) => n + b.plannedMin, 0);
  blocks.push({
    kind: "fun",
    title: idea.title,
    plannedMin: Math.max(3, minutes - used),
    done: false,
    ref: `fun:${idea.id}`,
    payload: { type: "fun", idea },
  });

  return blocks;
}

/** Strip the payload before saving. */
export function toSessionBlocks(blocks: PlannedBlock[]): SessionBlock[] {
  return blocks.map(({ kind, title, plannedMin, done, ref }) => ({
    kind,
    title,
    plannedMin,
    done,
    ref,
  }));
}
