import type { PlayerId, Settings, Who } from "./types";

type GoalSettings = Pick<Settings, "weeklyTargetDays"> & Partial<Pick<Settings, "goals" | "quietStats">>;

/** Days-a-week goal for a player, or for playing together. */
export function goalFor(settings: GoalSettings, who: Who): number {
  return settings.goals?.[who] ?? settings.weeklyTargetDays;
}

/** Does this player want streaks and weekly counts turned down? */
export function isQuiet(settings: Partial<Pick<Settings, "quietStats">>, who: Who): boolean {
  return who !== "both" && !!settings.quietStats?.includes(who as PlayerId);
}
