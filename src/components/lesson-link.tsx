import { lessonSearch } from "@/content/song-ideas";

/** Opens a YouTube search for a lesson in a new tab. */
export function LessonLink({ query, label = "Watch a lesson" }: { query: string; label?: string }) {
  return (
    <a
      href={lessonSearch(query)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 font-semibold underline decoration-2 underline-offset-4 hover:text-ink-dim"
    >
      {label} <span aria-hidden>↗</span>
    </a>
  );
}
