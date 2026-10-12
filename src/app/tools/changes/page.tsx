"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { BackLink } from "@/components/back-link";
import { ChangeCounter } from "@/components/change-counter";
import { Chip, PageTitle } from "@/components/ui";
import { pairId, unlockedPairs, UNLOCK_AT } from "@/content/chord-path";
import { playersFor } from "@/lib/players";
import { groupBests } from "@/lib/session/builder";
import { bestsOf, useMeasurements } from "@/lib/use-measurements";

export default function ChangesPage() {
  const { settings } = useApp();
  const { all, record } = useMeasurements();
  const players = playersFor(settings.activeWho ?? "ben");
  const bests = bestsOf(all ?? [], "chord-changes");
  const pairs = unlockedPairs(groupBests(players, bests));
  const [chosen, setChosen] = useState<string | null>(null);
  const pair = pairs.find((p) => pairId(p) === chosen) ?? pairs[0];

  return (
    <div>
      <BackLink href="/tools" label="Tools" />
      <div className="mt-4">
        <PageTitle>Chord changes</PageTitle>
        <p className="mt-2 max-w-prose text-ink-dim">
          New pairs open as you go: get any open pair to {UNLOCK_AT} and the next
          one unlocks.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {pairs.map((p) => {
          const id = pairId(p);
          const b = Math.min(...players.map((pl) => bests[pl][id] ?? 0));
          return (
            <Chip key={id} on={pairId(pair) === id} onClick={() => setChosen(id)}>
              {p[0]} ⇄ {p[1]}
              {b > 0 && <span className="num ml-2 opacity-70">{b}</span>}
            </Chip>
          );
        })}
      </div>

      <div className="mt-10">
        {all && (
          <ChangeCounter
            key={pairId(pair) + players.join()}
            pair={pair}
            players={players}
            bests={bests}
            onSave={(r) =>
              record({
                playerId: r.player,
                kind: "chord-changes",
                subject: pairId(pair),
                value: r.value,
              })
            }
          />
        )}
      </div>
    </div>
  );
}
