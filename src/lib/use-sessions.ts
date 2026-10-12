"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import type { PracticeSession } from "./types";

export function useSessions(): PracticeSession[] | null {
  const { store, dataVersion } = useApp();
  const [sessions, setSessions] = useState<PracticeSession[] | null>(null);
  useEffect(() => {
    if (!store) return;
    let live = true;
    store.listSessions().then((s) => live && setSessions(s));
    return () => {
      live = false;
    };
  }, [store, dataVersion]);
  return sessions;
}
