import Link from "next/link";
import { cn } from "@/lib/utils";

export type VvTheme = "night" | "morning";

/**
 * A themed CTA for the public redesign, built from scratch rather than
 * wrapping the legacy `Button` (`src/components/ui/button.tsx`). That
 * component's variants bake in `border-border-strong`/`text-fg`-style
 * classes on the OLD `--color-*` tokens, and `cn()`'s `twMerge` has no
 * `extendTailwindMerge` config for the new `vv-gold`/`night`/`morning`
 * theme names — it can't tell they're the same "border color" or "text
 * color" group as the old ones, so it never strips the old class, and
 * whichever rule happens to come later in the compiled stylesheet wins
 * (found live: the old `border-border-strong` was winning over an
 * override's `border-vv-gold`). A standalone component sidesteps the
 * conflict entirely instead of fighting a merge tool that doesn't know
 * about these tokens.
 */
export function VvButton({
  href,
  theme,
  className,
  children,
}: {
  href: string;
  theme: VvTheme;
  className?: string;
  children: React.ReactNode;
}) {
  // gold-deep is calibrated for Morning (§3.1: "on morning" — that's the
  // 4.54:1 pairing). Using it as Night's hover border measured ~3.8:1 and
  // read as the border going muddier on hover instead of brighter — the
  // opposite of what a hover state should do. Night brightens toward
  // ink-light instead (~17.5:1); Morning darkens toward ink-dark.
  const themeClass =
    theme === "night"
      ? "border-vv-gold text-ink-light hover:border-ink-light hover:text-vv-gold focus-visible:ring-vv-gold focus-visible:ring-offset-night"
      : "border-vv-gold-deep text-ink-dark hover:border-ink-dark hover:text-vv-gold-deep focus-visible:ring-vv-gold-deep focus-visible:ring-offset-morning";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-8 py-3.5 text-base font-medium tracking-wide transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        themeClass,
        className,
      )}
    >
      {children}
    </Link>
  );
}
