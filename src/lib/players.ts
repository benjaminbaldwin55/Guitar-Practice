import type { PlayerId, Who } from "./types";

export interface Player {
  id: PlayerId;
  name: string;
  guitar: string;
  /** CSS custom property holding this player's color. */
  colorVar: string;
}

export const PLAYERS: Record<PlayerId, Player> = {
  ben: {
    id: "ben",
    name: "Ben",
    guitar: "'68 Telecaster",
    colorVar: "var(--ben)",
  },
  anna: {
    id: "anna",
    name: "Anna",
    guitar: "Schecter PT Special",
    colorVar: "var(--anna)",
  },
};

export const PLAYER_IDS: PlayerId[] = ["ben", "anna"];

export function playersFor(who: Who): PlayerId[] {
  return who === "both" ? PLAYER_IDS : [who];
}

export function whoLabel(who: Who): string {
  return who === "both" ? "Ben & Anna" : PLAYERS[who].name;
}
