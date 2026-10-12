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

type Status = { kind: "ok" | "error"; text: string } | null;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="text-xl font-semibold" style={{ fontStretch: "112%" }}>
        {title}
      </h2>
      <div className="mt-4 max-w-prose">{children}</div>
    </section>
  );
}

const btn =
  "rounded-md px-4 py-2.5 font-medium transition-colors disabled:opacity-50";
const btnPrimary = `${btn} bg-brass text-rosewood hover:bg-brass-hi`;
const btnQuiet = `${btn} border border-line text-pearl hover:border-pearl-faint`;

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

  const target = settings.weeklyTargetDays;

  return (
    <div>
      <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">Settings</h1>

      <div className="mt-10">
        <Section title="Weekly goal">
          <p className="text-pearl-dim">
            Days a week you each aim to play. Rest days never break a streak,
            only missed weeks do.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              className={btnQuiet}
              onClick={() => updateSettings({ weeklyTargetDays: target - 1 })}
              disabled={target <= 2}
              aria-label="One fewer day"
            >
              −
            </button>
            <span className="num w-28 text-center text-lg">
              {target} days
            </span>
            <button
              type="button"
              className={btnQuiet}
              onClick={() => updateSettings({ weeklyTargetDays: target + 1 })}
              disabled={target >= 7}
              aria-label="One more day"
            >
              +
            </button>
          </div>
        </Section>

        <Section title="Backup">
          <p className="text-pearl-dim">
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
            <div className="mt-6 rounded-md border border-line bg-rosewood-2 p-5">
              <p>
                Backup from{" "}
                {new Date(pending.exportedAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
                : {pending.sessions.length} sessions,{" "}
                {pending.measurements.length} measurements,{" "}
                {pending.recordings.length} recordings.
              </p>
              <p className="mt-2 text-sm text-pearl-dim">
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
                  className={`${btnQuiet} hover:border-jewel hover:text-jewel`}
                  onClick={() => restore("replace")}
                  disabled={busy}
                >
                  Replace everything
                </button>
                <button
                  type="button"
                  className={`${btn} text-pearl-dim hover:text-pearl`}
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
              className={`mt-4 text-sm ${status.kind === "error" ? "text-jewel" : "text-pearl-dim"}`}
            >
              {status.text}
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
