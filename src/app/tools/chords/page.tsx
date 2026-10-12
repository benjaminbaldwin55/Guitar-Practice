import { BackLink } from "@/components/back-link";
import { ChordDiagram } from "@/components/chord-diagram";
import { ScaleBox } from "@/components/scale-box";
import { StrumPatternView } from "@/components/strum-pattern";
import { PageTitle } from "@/components/ui";
import { CHORDS } from "@/lib/music/chords";
import { SCALES } from "@/content/scales";
import { STRUMS } from "@/content/strums";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-black" style={{ fontStretch: "115%" }}>
      {children}
    </h2>
  );
}

export default function ChordsPage() {
  return (
    <div>
      <BackLink href="/tools" label="Tools" />
      <div className="mt-4">
        <PageTitle>Chords & scales</PageTitle>
      </div>

      <section className="mt-12">
        <H2>Open chords</H2>
        <p className="mt-2 text-ink-dim">
          Numbers are fingers: 1 index, 2 middle, 3 ring, 4 pinky. ○ means play
          the open string, × means skip it.
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {Object.values(CHORDS).map((c) => (
            <li key={c.id} className="flex flex-col items-center text-center">
              <ChordDiagram id={c.id} size={130} />
              <p className="mt-2 text-sm text-ink-dim">{c.tip}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t-(length:--bw) border-line pt-10">
        <H2>Strum patterns</H2>
        <p className="mt-2 text-ink-dim">
          Your strumming hand never stops: down on the numbers, up on the &amp;.
          A blank square means the hand still moves but misses the strings.
        </p>
        <ul className="mt-8 grid gap-10 md:grid-cols-2">
          {STRUMS.map((s) => (
            <li key={s.id}>
              <h3 className="text-xl font-bold">{s.name}</h3>
              <div className="mt-3">
                <StrumPatternView pattern={s} />
              </div>
              <p className="mt-3 text-sm text-ink-dim">{s.tip}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t-(length:--bw) border-line pt-10">
        <H2>Pentatonic boxes</H2>
        <p className="mt-2 text-ink-dim">
          Drawn like tab: the high e string is on top. Red dots are the root note.
        </p>
        <ul className="mt-8 grid gap-10 md:grid-cols-2">
          {Object.values(SCALES).map((s) => (
            <li key={s.id}>
              <h3 className="text-xl font-bold">{s.name}</h3>
              <div className="mt-3">
                <ScaleBox id={s.id} />
              </div>
              <p className="mt-3 text-sm text-ink-dim">{s.tip}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
