"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-provider";
import { whoLabel } from "@/lib/players";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/tools", label: "Tools" },
  { href: "/songs", label: "Songs" },
  { href: "/progress", label: "Achievements" },
  { href: "/settings", label: "Settings" },
];

function whoColor(who: string | null) {
  if (who === "ben") return "var(--ben)";
  if (who === "anna") return "var(--anna)";
  if (who === "both") return "var(--both)";
  return "var(--ink-faint)";
}

export function Nav() {
  const path = usePathname();
  const { settings } = useApp();
  const who = settings.activeWho;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t-(length:--bw) border-line bg-surface md:sticky md:top-0 md:h-dvh md:w-52 md:shrink-0 md:border-t-0 md:border-r-(length:--bw)"
    >
      <div className="hidden px-6 pt-10 pb-8 md:block">
        <p className="text-sm text-ink-faint">Playing now</p>
        <p
          className="mt-1 text-lg font-semibold"
          style={{ color: whoColor(who), fontStretch: "112%" }}
        >
          {who ? whoLabel(who) : "Nobody yet"}
        </p>
      </div>
      <ul className="flex justify-around px-1 md:flex-col md:gap-1 md:px-3">
        {ITEMS.map(({ href, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-[min(var(--r),12px)] px-2 py-3 text-xs transition-colors sm:text-sm md:px-3 md:py-2 md:text-[15px] ${
                  active
                    ? "font-semibold text-ink md:bg-surface-2"
                    : "text-ink-dim hover:text-ink"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
