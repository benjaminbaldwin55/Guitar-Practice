# Guitar Practice

A practice app for Ben and Anna: daily sessions that change every day, measured
progress, and songs split into small wins.

## Run it on your laptop

You need Node.js (you already have it). The first time:

```bash
cd ~/Documents
git clone https://github.com/benjaminbaldwin55/Guitar-Practice.git
cd Guitar-Practice
npm install
```

Then, every time you want to use it:

```bash
npm run dev
```

and open http://localhost:3000.

Your data is saved in that browser. Use **Settings > Download backup** now and
then.

## What's where

| Folder | What it is |
|---|---|
| `me/` | Who we are: profiles, coaching notes, songs. The coach reads these. |
| `src/app/` | The app's screens |
| `src/lib/` | Logic: data storage, streaks, backups |
| `legacy/` | The old April 2026 app, kept for reference |

## Commands

| | |
|---|---|
| `npm run dev` | Run the app locally |
| `npm test` | Run the tests |
| `npm run lint` | Check the code |
| `npm run build` | Production build |

## Build plan

- [x] **Phase 0: Setup.** App shell, `/me` profiles, local saving, backup
- [ ] **Phase 1: Usable app.** Tuner, metronome, warm-ups, session builder, logging, streaks
- [ ] **Phase 2: Progress engine.** Skill tree, measured drills, song milestones, stats
- [ ] **Phase 3: Together.** Duet mode, shared goals, recordings, ear training
- [ ] **Phase 4: Extras.** Drum machine, tone presets, weekly coach review
- [ ] **Hosting.** Last, once everything looks right
