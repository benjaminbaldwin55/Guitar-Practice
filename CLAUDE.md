# Guitar Practice: notes for Claude

A practice and teaching app for two beginner guitarists, Ben and Anna, who
learn together and also work on their own songs.

## Read first
- `me/` holds who they are. Read the relevant `profile.md` and `coaching.md`
  before planning lessons, picking songs, or writing user-facing copy.
- `legacy/` is the old April 2026 app. Port pieces from it (tuner pitch
  detection, metronome scheduling, chord and scale SVGs) but don't edit it.

## Why the last app failed (design against this)
Monotonous routine, goals too far away, progress only self-reported. So:
vary every session, keep a milestone 1 or 2 sessions away, measure things.

## Product rules
- Less writing, more playing. No forms. Record numbers during play; at most
  one tap after a session; weekly review at most two tap questions.
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

## Design tokens (src/app/globals.css)
rosewood (base), pearl (text), brass (actions), jewel (live states only:
tuner on, recording). Player colors: Ben = denim `--ben`, Anna = purple burst
`--anna`, together = brass. Archivo, wide and heavy (`.display`) for names and
big numbers only.

## Style for copy
Casual and plain. No em dashes.
