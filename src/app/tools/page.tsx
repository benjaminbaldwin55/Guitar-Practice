import Link from "next/link";
import { PageTitle } from "@/components/ui";

const TOOLS = [
  { href: "/tools/tuner", name: "Tuner", sub: "Standard, Drop D, or half step down" },
  { href: "/tools/metronome", name: "Metronome", sub: "Tap tempo, subdivisions, speed trainer" },
  { href: "/tools/changes", name: "Chord changes", sub: "One-minute challenge. The mic counts." },
  { href: "/tools/chords", name: "Chords & scales", sub: "Shapes, strum patterns, pentatonic boxes" },
];

export default function Tools() {
  return (
    <div>
      <PageTitle>Tools</PageTitle>
      <ul className="mt-10 border-t-(length:--bw) border-line">
        {TOOLS.map((t) => (
          <li key={t.href} className="border-b-(length:--bw) border-line">
            <Link
              href={t.href}
              className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1 py-6 hover:bg-surface"
            >
              <span className="display text-[clamp(2rem,5vw,3.5rem)] transition-transform group-hover:translate-x-1">
                {t.name}
              </span>
              <span className="text-ink-dim">{t.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
