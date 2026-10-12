import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "quiet" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-(--r) border-(length:--bw) font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "border-ink bg-action text-action-ink hover:bg-action-hi",
  quiet: "border-ink bg-transparent text-ink hover:bg-surface",
  ghost: "border-transparent text-ink-dim hover:text-ink",
  danger: "border-ink bg-transparent text-ink hover:bg-live hover:text-action-ink",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5",
  lg: "px-7 py-4 text-lg",
};

export function Button({
  variant = "quiet",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}

/** A toggle in a row of choices. */
export function Chip({
  on,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`rounded-(--r) border-(length:--bw) border-ink px-4 py-2 font-semibold transition-colors ${
        on ? "bg-ink text-bg" : "bg-transparent text-ink hover:bg-surface"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">{children}</h1>
  );
}

/** A bordered panel. Used sparingly, for things you interact with. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[min(var(--r),20px)] border-(length:--bw) border-ink bg-surface p-5 md:p-7 ${className}`}
    >
      {children}
    </div>
  );
}
