import { cn } from "@/lib/utils";

export type VvTheme = "night" | "morning";

/**
 * Every public-page section owns a SOLID background and a fixed (never
 * scroll-scrubbed or interpolated) text color for its declared theme — see
 * DESIGN.md §5's round-1 correction. Text contrast is therefore always one
 * of the two measured endpoints (17.53:1 / 15.70:1 for primary text), never
 * a blended value, because there is nothing here for it to blend with.
 */
export function SectionTheme({
  theme,
  as: Tag = "section",
  className,
  children,
  ...props
}: {
  theme: VvTheme;
  as?: "section" | "div" | "header" | "footer";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      data-vv-theme={theme}
      className={cn(theme === "night" ? "bg-night text-ink-light" : "bg-morning text-ink-dark", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * The seam between a Night section and a Morning one (or back). A static
 * CSS gradient, not a scroll-driven opacity crossfade: it paints the exact
 * same "dawn" blend at every scroll position with zero JS and zero risk of
 * a mid-animation frame landing on an out-of-spec color, which a scroll-
 * scrubbed version could — see DESIGN.md §5 for why that approach was
 * dropped. Deliberately empty of content: this is the whitespace between
 * two sections, so no text is ever rendered against the blended band.
 */
export function ThemeSeam({ from, to, className }: { from: VvTheme; to: VvTheme; className?: string }) {
  const fromColor = from === "night" ? "var(--night)" : "var(--morning)";
  const toColor = to === "night" ? "var(--night)" : "var(--morning)";
  return (
    <div
      aria-hidden
      className={cn("h-[12vh] w-full sm:h-[16vh]", className)}
      style={{ background: `linear-gradient(to bottom, ${fromColor}, ${toColor})` }}
    />
  );
}
