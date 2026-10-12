"use client";

import { useMemo } from "react";
import { useApp } from "@/components/app-provider";
import { evaluate, historyFor, type AchievementState, type Owner } from "./achievements";
import { useMeasurements } from "./use-measurements";
import { useSessions } from "./use-sessions";

export function useAchievements(owner: Owner): AchievementState[] | null {
  const { settings } = useApp();
  const sessions = useSessions();
  const { all } = useMeasurements();
  return useMemo(() => {
    if (!sessions || !all) return null;
    return evaluate(owner, historyFor(owner, sessions, all, settings));
  }, [owner, sessions, all, settings]);
}

export function ownerColor(owner: Owner): { color: string; on: string } {
  if (owner === "together") return { color: "var(--both)", on: "var(--on-both)" };
  return { color: `var(--${owner})`, on: `var(--on-${owner})` };
}
