export interface TempoRun {
  start: number;
  top: number;
}

/**
 * Where to start a drill next time: halfway between where you started last
 * time and the fastest you played it clean. If nothing was nailed, start
 * where you started.
 */
export function nextStartBpm(run: TempoRun): number {
  return Math.round((run.start + Math.max(run.start, run.top)) / 2);
}
