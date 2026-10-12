"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { newId } from "./ids";
import type { TempoRun } from "./tempo";
import type { Measurement, MeasurementKind, PlayerId } from "./types";

export type Bests = Record<PlayerId, Record<string, number>>;

/** Best value per player per subject for one kind of measurement. */
export function bestsOf(ms: Measurement[], kind: MeasurementKind): Bests {
  const out: Bests = { ben: {}, anna: {} };
  for (const m of ms) {
    if (m.kind !== kind) continue;
    const cur = out[m.playerId][m.subject];
    if (cur === undefined || m.value > cur) out[m.playerId][m.subject] = m.value;
  }
  return out;
}

export function useMeasurements() {
  const { store, dataVersion } = useApp();
  const [all, setAll] = useState<Measurement[] | null>(null);

  useEffect(() => {
    if (!store) return;
    let live = true;
    store.listMeasurements().then((m) => live && setAll(m));
    return () => {
      live = false;
    };
  }, [store, dataVersion]);

  /** Save a measurement. Pass an `id` to overwrite an earlier one (same block, same session). */
  const record = useCallback(
    async (m: Omit<Measurement, "id" | "at"> & { id?: string }) => {
      if (!store) return;
      const full: Measurement = { ...m, id: m.id ?? newId(), at: new Date().toISOString() };
      await store.putMeasurement(full);
      setAll((a) => [...(a ?? []).filter((x) => x.id !== full.id), full]);
    },
    [store],
  );

  return { all, record };
}

/** The most recent tempo run per player per block ref. */
export function lastTempos(ms: Measurement[]): Record<PlayerId, Record<string, TempoRun>> {
  const out: Record<PlayerId, Record<string, TempoRun & { at: string }>> = { ben: {}, anna: {} };
  for (const m of ms) {
    if (m.kind !== "tempo" || m.meta?.start === undefined) continue;
    const cur = out[m.playerId][m.subject];
    if (!cur || m.at > cur.at) out[m.playerId][m.subject] = { start: m.meta.start, top: m.value, at: m.at };
  }
  return out;
}
