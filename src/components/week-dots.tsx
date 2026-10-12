const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** One dot per day this week, filled on days that counted. Like fret inlays. */
export function WeekDots({
  keys,
  played,
  today,
  color,
}: {
  keys: string[];
  played: Set<string>;
  today: string;
  color: string;
}) {
  return (
    <ol className="flex gap-1.5" aria-label="This week">
      {keys.map((k, i) => {
        const on = played.has(k);
        const isToday = k === today;
        return (
          <li key={k} className="flex flex-col items-center gap-1">
            <span
              className="block size-3 rounded-full border"
              style={{
                background: on ? color : "transparent",
                borderColor: on ? color : isToday ? "var(--pearl-dim)" : "var(--line)",
              }}
            />
            <span
              className={`text-[10px] ${isToday ? "text-pearl" : "text-pearl-faint"}`}
              aria-hidden
            >
              {LETTERS[i]}
            </span>
            <span className="sr-only">
              {on ? "practiced" : "not yet"}
              {isToday ? " (today)" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
