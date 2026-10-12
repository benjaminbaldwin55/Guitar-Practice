import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-ink-dim underline-offset-4 hover:text-ink hover:underline">
      ← {label}
    </Link>
  );
}
