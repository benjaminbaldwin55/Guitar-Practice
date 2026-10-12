import type { Who } from "@/lib/types";

/**
 * Songs to play along with for fun, from each player's taste in me/*.md.
 * Keep in sync with me/ben/songs.md and me/anna/songs.md (the weekly coach
 * review updates both). Links search YouTube for a beginner lesson rather
 * than pointing at one video that might disappear.
 */
export interface SongIdea {
  title: string;
  artist: string;
  for: Who; // "both" means a good pick for playing together
  level: 1 | 2 | 3; // 1 easy, 2 a stretch, 3 a goal
  kind: "riff" | "chords" | "picking";
  why: string;
}

export const SONG_IDEAS: SongIdea[] = [
  // Ben: 90s rock, grunge, a little country and John Mayer
  { title: "Something in the Way", artist: "Nirvana", for: "ben", level: 1, kind: "chords", why: "Slow, quiet, and only a couple of shapes. Great first full song." },
  { title: "Come As You Are", artist: "Nirvana", for: "ben", level: 1, kind: "riff", why: "One of the most famous beginner riffs. Single notes, low strings." },
  { title: "Polly", artist: "Nirvana", for: "ben", level: 1, kind: "chords", why: "A handful of chords on repeat. Easy to sing over." },
  { title: "About a Girl", artist: "Nirvana", for: "ben", level: 2, kind: "chords", why: "Was the first song in your old plan. Clean tone, steady strum." },
  { title: "One Headlight", artist: "The Wallflowers", for: "ben", level: 2, kind: "chords", why: "Open chords and a laid-back strum the whole way through." },
  { title: "Lightning Crashes", artist: "Live", for: "ben", level: 2, kind: "chords", why: "Builds from quiet to huge. Good strumming dynamics practice." },
  { title: "Far Behind", artist: "Candlebox", for: "ben", level: 2, kind: "chords", why: "Open chords that ring, then a big chorus." },
  { title: "Rooster", artist: "Alice in Chains", for: "ben", level: 2, kind: "riff", why: "Jerry Cantrell riff territory. Slow and heavy." },
  { title: "Learn to Fly", artist: "Foo Fighters", for: "ben", level: 2, kind: "chords", why: "Upbeat and fun once your chord changes are quick." },
  { title: "1979", artist: "Smashing Pumpkins", for: "ben", level: 2, kind: "riff", why: "Hypnotic little part that repeats. Great with the looper." },
  { title: "Shelf in the Room", artist: "Days of the New", for: "ben", level: 2, kind: "picking", why: "You already know part of it. Pick up where you left off." },
  { title: "Interstate Love Song", artist: "Stone Temple Pilots", for: "ben", level: 3, kind: "chords", why: "A step up, but one of the best riffs on your list." },
  { title: "Slow Dancing in a Burning Room", artist: "John Mayer", for: "ben", level: 3, kind: "chords", why: "Bluesy and smooth. The licks build on the pentatonic boxes." },
  { title: "Stay a Little Longer", artist: "Brothers Osborne", for: "ben", level: 3, kind: "riff", why: "The big goal. Peek at it now and then to see how close you're getting." },

  // Together: easy sing-alongs until Anna picks her own songs
  { title: "Knockin' on Heaven's Door", artist: "Bob Dylan", for: "both", level: 1, kind: "chords", why: "Four easy open chords, slow, and made for singing along." },
  { title: "Horse with No Name", artist: "America", for: "both", level: 1, kind: "chords", why: "Two chord shapes the whole song. One plays, one sings." },
  { title: "Free Fallin'", artist: "Tom Petty", for: "both", level: 2, kind: "chords", why: "A classic to sing together. Uses a capo." },
];

export function lessonSearch(q: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

export function songLesson(s: SongIdea): string {
  return lessonSearch(`${s.title} ${s.artist} easy guitar lesson`);
}

/** Songs that fit who's playing, easiest first. */
export function songsFor(who: Who): SongIdea[] {
  const list = SONG_IDEAS.filter((s) => s.for === who || s.for === "both");
  return list.sort((a, b) => a.level - b.level);
}
