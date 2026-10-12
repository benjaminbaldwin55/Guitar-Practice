"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { whoLabel } from "@/lib/players";
import { useApp } from "./app-provider";
import { Icon } from "./icons";

const ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/practice", label: "Practice", icon: "play" },
  { href: "/tools", label: "Tools", icon: "tools" },
  { href: "/songs", label: "Songs", icon: "songs" },
  { href: "/progress", label: "Achievements", short: "Awards", icon: "trophy" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

function whoColors(who: string | null): { bg: string; fg: string } | null {
  if (who === "ben") return { bg: "var(--ben)", fg: "var(--on-ben)" };
  if (who === "anna") return { bg: "var(--anna)", fg: "var(--on-anna)" };
  if (who === "both") return { bg: "var(--both)", fg: "var(--on-both)" };
  return null;
}

export function Nav() {
  const path = usePathname();
  const { settings } = useApp();
  const who = settings.activeWho;
  const c = whoColors(who);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t-(length:--bw) border-line bg-surface md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-t-0 md:border-r-(length:--bw)"
    >
      {/* Who's playing, as a sticker */}
      <div className="hidden px-5 pt-8 pb-7 md:block">
        <Link
          href="/"
          className={`press block -rotate-2 rounded-(--r) border-(length:--bw) px-4 py-3 ${
            c ? "candy border-ink" : "border-dashed border-ink-faint"
          }`}
          style={c ? { background: c.bg, color: c.fg } : undefined}
        >
          <span className="block text-xs font-semibold opacity-80">Playing now</span>
          <span className="display block text-2xl" style={{ fontStretch: "118%" }}>
            {who ? whoLabel(who) : "Pick a player"}
          </span>
        </Link>
      </div>

      <ul className="flex justify-around px-1 py-1.5 md:flex-col md:gap-1.5 md:px-4 md:py-0">
        {ITEMS.map(({ href, label, short, icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-1 rounded-(--r) border-2 px-2 py-1.5 text-[11px] font-semibold transition-transform sm:text-xs md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-[15px] ${
                  active
                    ? "candy-sm -rotate-1 border-ink bg-action text-action-ink"
                    : "border-transparent text-ink-dim hover:text-ink md:hover:translate-x-1"
                }`}
              >
                <Icon name={icon} size={20} stroke={2.4} />
                <span className="md:hidden">{short ?? label}</span>
                <span className="hidden md:inline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
