# Guitar Practice: notes for Claude

A practice and teaching app for two beginner guitarists, Ben and Anna, who
learn together and also work on their own songs. It's meant to carry them
from beginner to advanced over years: see ROADMAP.md for the stages.

## Read first
- `me/` holds who they are. Read the relevant `profile.md` and `coaching.md`
  before planning lessons, picking songs, or writing user-facing copy.
- `legacy/` is the old April 2026 app. Port pieces from it (tuner pitch
  detection, metronome scheduling, chord and scale SVGs) but don't edit it.

## Why the last app failed (design against this)
Monotonous routine, goals too far away, progress only self-reported. So:
vary every session, keep a milestone 1 or 2 sessions away, measure things.

## Product rules
- Less writing, more playing. No forms. Record numbers during play. After a
  session: tap how it felt, tap whether anything hurt, Save (Ben asked to
  always get the pain question before leaving). Weekly review at most two
  tap questions.
- Cooperative, never competitive between Ben and Anna.
- Ben has had wrist pain: warm-up every session, soft cap on length, stop on pain.
- Always end a session on something fun.
- No lyrics stored in the app. Chords, structure and riffs we write
  ourselves; link out for full tabs.

## Tech
- Next.js 15 (App Router) + TypeScript + Tailwind v4. Laptop first, must
  also work on phones.
- All data goes through the `Store` interface in `src/lib/store/`. Today it's
  IndexedDB (browser only). A synced store comes at hosting time, so never
  touch IndexedDB directly from UI code.
- Font is self-hosted (`@fontsource-variable/archivo`), not Google Fonts.
- Hosting is deliberately the very last step. Don't add backend services
  before then.
- Run `npm test`, `npm run lint`, `npm run build` before committing.

## How practice works
- `src/lib/session/builder.ts` builds each session: warm-up, the weakest open
  chord change (measured), one or two rotating blocks (strum, scale,
  progression), and a fun finish. It avoids refs used in recent sessions.
- `src/content/chord-path.ts` is the learning path. Two chord pairs open on
  day one; every pair that reaches 20 changes/min opens the next.
- Measurements: `chord-changes` (subject = pair id like `Em-G`, editable
  after), `clean-bpm` (subject = block ref like `strum:campfire`, from
  "Nailed it"), and `tempo` (one block's run: value = fastest nailed,
  meta.start = starting tempo). Next session starts a drill halfway between
  last start and last fastest (`src/lib/tempo.ts`).
- Chord changes are counted by `src/lib/audio/change-detector.ts`: it knows
  the two chords, classifies what's ringing by pitch-class content (chroma),
  and counts only confirmed switches. A one-strum-per-chord calibration
  tunes it to the guitar. Volume barely matters; re-strums never count.
- Tuner uses the McLeod pitch method plus `PitchSmoother`. Don't go back to
  plain autocorrelation: it jumps octaves on low strings and fails with
  distortion. Saved tuning list lives in settings (`tunings`, recent first).
- Accuracy for both was measured against real guitar recordings
  (tonejs-instrument-guitar-*-mp3 on npm) through a simulated laptop mic.
  Re-run that kind of check before changing either algorithm.
- Together sessions plan around the weaker player's scores and take turns
  on measured drills (one mic can't tell two guitars apart).
- If the last session was marked "something hurt", the next one defaults
  to 10 minutes, low energy.
- Every block has one set of controls at the top (Back, Pause, Next). Don't
  add a second timer or pause inside a block.
- Fun block: the idea, a how-to/backing-track link, two swaps, and "Or play
  a song" from `src/content/song-ideas.ts` (YouTube lesson searches, never
  hard-coded video links).

## Achievements
- `src/lib/achievements.ts`: a catalog of tiered ladders (sessions, hours,
  streaks, chord changes, speed, explorer, together, plus locked "on the
  horizon" goals). They're computed from sessions and measurements, never
  stored, so new ones credit past practice. Player ones are earned by Ben
  and Anna separately; together ones only count duo sessions.
- When adding a feature, add its achievements too (see ROADMAP.md), and
  flip any matching "future" achievement to a real measure.
- The Saved screen diffs achievements from session start to show unlocks.
- Shuffle passes the current plan as `avoid` to the builder, so every block
  changes where an alternative exists.

## Lead guitar
Soloing is its own track from the start (see ROADMAP.md "lead guitar
track"), not a late-stage extra. Ben's north star is lead playing.

## Design tokens (src/app/globals.css)
"Licorice", picked by Ben and Anna: a modern candy shop at night. Dark plum
`--bg`, light `--ink`, candy colors only where they mean something:
bubblegum `--action`, player colors Ben blue raspberry `--ben`, Anna grape
`--anna`, together butterscotch `--both` (text on them uses `--on-*`).
`--live` only for live states, `--good` for success. The signature: tilted
stickers and hard offset shadows that glow pink (`.candy`, `.candy-sm`,
`.press`, `--shadow-c`). Archivo, wide and heavy (`.display`), for names and
big numbers only. Bold, not busy: no gradients, no extra decoration.

## Style for copy
Casual and plain. No em dashes.
