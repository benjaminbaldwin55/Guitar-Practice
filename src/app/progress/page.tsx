"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Sticker } from "@/components/sticker";
import { Chip, PageTitle } from "@/components/ui";
import { closest, GROUPS, type AchievementState, type Owner } from "@/lib/achievements";
import { ownerColor, useAchievements } from "@/lib/use-achievements";

const OWNERS: { v: Owner; label: string }[] = [
  { v: "ben", label: "Ben" },
  { v: "anna", label: "Anna" },
  { v: "together", label: "Together" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Card({ s, owner }: { s: AchievementState; owner: Owner }) {
  const { color, on } = ownerColor(owner);
  const { def, unlocked, value, at } = s;
  return (
    <li className="flex items-center gap-4">
      <Sticker state={s} color={color} on={on} />
      <div className="min-w-0 flex-1">
        <h3 className={`text-lg leading-tight font-bold ${unlocked ? "" : "text-ink-dim"}`}>{def.title}</h3>
        <p className={`text-sm ${unlocked ? "text-ink-dim" : "text-ink-faint"}`}>{def.desc}</p>
        {unlocked && at && <p className="mt-1 text-xs font-semibold">Earned {fmtDate(at)}</p>}
        {!unlocked && def.future && <p className="mt-1 text-xs font-semibold text-ink-faint">{def.future}</p>}
        {!unlocked && !def.future && def.target > 1 && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-dim">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full bg-ink" style={{ width: `${(value / def.target) * 100}%` }} />
            </span>
            <span className="num">
              {value} / {def.target}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

export default function ProgressPage() {
  const { settings } = useApp();
  const [owner, setOwner] = useState<Owner>(
    settings.activeWho === "both" ? "together" : (settings.activeWho ?? "ben"),
  );
  const states = useAchievements(owner);
  const { color } = ownerColor(owner);

  if (!states) return null;
  const earnable = states.filter((s) => !s.def.future);
  const earned = earnable.filter((s) => s.unlocked);
  const almost = closest(states);

  return (
    <div>
      <PageTitle>Achievements</PageTitle>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap gap-2">
          {OWNERS.map((o) => (
            <Chip key={o.v} on={owner === o.v} onClick={() => setOwner(o.v)}>
              {o.label}
            </Chip>
          ))}
        </div>
        <p className="text-lg">
          <span className="display num text-5xl" style={{ color }}>
            {earned.length}
          </span>{" "}
          <span className="text-ink-dim">of {earnable.length} earned</span>
        </p>
      </div>

      {almost.length > 0 && (
        <section className="mt-10 rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5 md:p-6">
          <h2 className="text-xl font-black" style={{ fontStretch: "115%" }}>
            Almost there
          </h2>
          <ul className="mt-4 grid gap-5 md:grid-cols-3">
            {almost.map((s) => (
              <Card key={s.def.id} s={s} owner={owner} />
            ))}
          </ul>
        </section>
      )}

      {GROUPS.map((g) => {
        const items = states.filter((s) => s.def.group === g.id);
        if (!items.length) return null;
        const got = items.filter((s) => s.unlocked).length;
        return (
          <section key={g.id} className="mt-12 border-t-(length:--bw) border-line pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-3xl font-black" style={{ fontStretch: "115%" }}>
                {g.title}
              </h2>
              <span className="num text-ink-dim">
                {g.id === "ahead" ? g.blurb : `${got} of ${items.length}`}
              </span>
            </div>
            {g.id !== "ahead" && <p className="mt-1 text-ink-dim">{g.blurb}</p>}
            <ul className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <Card key={s.def.id} s={s} owner={owner} />
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-14 max-w-prose text-sm text-ink-dim">
        Stats and charts for chord changes and tempos are coming to this page
        next. Everything here is worked out from your practice history, so new
        achievements added later will count what you&apos;ve already done.
      </p>
    </div>
  );
}
