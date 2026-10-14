"use client";

import { useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import {
  exportBackup,
  importBackup,
  parseBackup,
  type Backup,
} from "@/lib/store/backup";
import { dayKey } from "@/lib/streaks";
import { goalFor, isQuiet } from "@/lib/goals";
import { PLAYERS } from "@/lib/players";
import { Chip } from "@/components/ui";

const GOAL_ROWS: { who: "ben" | "anna" | "both"; label: string }[] = [
  { who: "ben", label: "Ben" },
  { who: "anna", label: "Anna" },
  { who: "both", label: "Together" },
];

type Status = { kind: "ok" | "error"; text: string } | null;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t-(length:--bw) border-line py-8">
      <h2 className="text-xl font-semibold" style={{ fontStretch: "112%" }}>
        {title}
      </h2>
      <div className="mt-4 max-w-prose">{children}</div>
    </section>
  );
}

const btn =
  "rounded-(--r) border-(length:--bw) border-ink px-5 py-2.5 font-semibold transition-colors disabled:opacity-50";
const btnPrimary = `${btn} bg-action text-action-ink hover:bg-action-hi`;
const btnQuiet = `${btn} bg-transparent text-ink hover:bg-surface`;

export default function SettingsPage() {
  const { store, settings, updateSettings, dataChanged } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function download() {
    if (!store) return;
    setBusy(true);
    try {
      const backup = await exportBackup(store);
      const blob = new Blob([JSON.stringify(backup)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guitar-practice-backup-${dayKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({
        kind: "ok",
        text: `Backup downloaded: ${backup.sessions.length} sessions, ${backup.recordings.length} recordings.`,
      });
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setStatus(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function restore(mode: "merge" | "replace") {
    if (!store || !pending) return;
    setBusy(true);
    try {
      const r = await importBackup(store, pending, mode);
      setStatus({
        kind: "ok",
        text: `Restored ${r.sessions} sessions, ${r.measurements} measurements, and ${r.recordings} recordings.`,
      });
      setPending(null);
      dataChanged();
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Settings</h1>

      <div className="mt-10">
        <Section title="Weekly goals">
          <p className="text-ink-dim">
            Days a week each of you aims to play, and how often you play
            together. Rest days never break a streak, only missed weeks do.
          </p>
          <ul className="mt-5 space-y-4">
            {GOAL_ROWS.map(({ who, label }) => {
              const value = goalFor(settings, who);
              const set = (v: number) => updateSettings({ goals: { ...settings.goals, [who]: v } });
              return (
                <li key={who} className="flex flex-wrap items-center gap-3">
                  <span className="w-24 font-bold" style={{ color: `var(--${who})` }}>
                    {label}
                  </span>
                  <button type="button" className={btnQuiet} onClick={() => set(value - 1)} disabled={value <= 1} aria-label={`${label}: one fewer day`}>
                    −
                  </button>
                  <span className="num w-24 text-center text-lg">
                    {value} {value === 1 ? "day" : "days"}
                  </span>
                  <button type="button" className={btnQuiet} onClick={() => set(value + 1)} disabled={value >= 7} aria-label={`${label}: one more day`}>
                    +
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Streaks and counts">
          <p className="text-ink-dim">
            Some people love streaks, some find them stressful. Turn them off
            and you&apos;ll see personal bests instead. Achievements stay either way.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {(["ben", "anna"] as const).map((p) => {
              const quiet = isQuiet(settings, p);
              return (
                <Chip
                  key={p}
                  on={!quiet}
                  onClick={() =>
                    updateSettings({
                      quietStats: quiet
                        ? settings.quietStats.filter((x) => x !== p)
                        : [...settings.quietStats, p],
                    })
                  }
                >
                  {PLAYERS[p].name}: streaks {quiet ? "off" : "on"}
                </Chip>
              );
            })}
          </div>
        </Section>

        <Section title="Backup">
          <p className="text-ink-dim">
            Everything is saved in this browser on this computer. Download a
            backup now and then so your progress never depends on one browser.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={btnPrimary}
              onClick={download}
              disabled={busy || !store}
            >
              Download backup
            </button>
            <button
              type="button"
              className={btnQuiet}
              onClick={() => fileRef.current?.click()}
              disabled={busy || !store}
            >
              Restore from backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          {pending && (
            <div className="candy mt-6 rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5">
              <p>
                Backup from{" "}
                {new Date(pending.exportedAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
                : {pending.sessions.length} sessions,{" "}
                {pending.measurements.length} measurements,{" "}
                {pending.recordings.length} recordings.
              </p>
              <p className="mt-2 text-sm text-ink-dim">
                Add keeps what&apos;s here and adds the backup on top. Replace
                deletes everything here first.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => restore("merge")}
                  disabled={busy}
                >
                  Add to what&apos;s here
                </button>
                <button
                  type="button"
                  className={`${btnQuiet} hover:bg-live hover:text-action-ink`}
                  onClick={() => restore("replace")}
                  disabled={busy}
                >
                  Replace everything
                </button>
                <button
                  type="button"
                  className={`${btn} border-transparent text-ink-dim hover:text-ink`}
                  onClick={() => setPending(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {status && (
            <p
              role="status"
              className={`mt-4 text-sm ${status.kind === "error" ? "text-live" : "text-ink-dim"}`}
            >
              {status.text}
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
