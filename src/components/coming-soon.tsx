export function ComingSoon({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div>
      <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">{title}</h1>
      <p className="mt-6 max-w-prose text-pearl-dim">Being built next:</p>
      <ul className="mt-3 max-w-prose space-y-2 text-pearl">
        {lines.map((l) => (
          <li key={l} className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
