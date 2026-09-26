import Image from "next/image";
import { cn } from "@/lib/utils";
import { Glint } from "@/components/vv/Glint";
import type { VvTheme } from "@/components/vv/SectionTheme";

const RATIO_MAP: Record<string, string> = {
  "3:4": "3 / 4",
  "4:5": "4 / 5",
  "1:1": "1 / 1",
  "16:9": "16 / 9",
  "5:4": "5 / 4",
};

type ArtSlotProps = {
  ratio: keyof typeof RATIO_MAP;
  theme: VvTheme;
  caption?: string;
  src?: string | null;
  alt?: string;
  sizes?: string;
  /** "portrait" swaps the empty state for large initials instead of a
   * plain warm fill — see DESIGN.md §6.4's Masters round-1 amendment. */
  kind?: "default" | "portrait";
  initials?: string;
  /** Fires the signature sweep on hover — DESIGN.md: only when a real
   * photo exists, never on a placeholder (would read as a glitch). */
  glintOnHover?: boolean;
  className?: string;
};

/**
 * Every image position on the public site is this component, never a raw
 * `next/image` or a plain gray box (DESIGN.md §7.1). With no `src`, it's a
 * considered placeholder — correct aspect ratio, themed warm fill, ~4%
 * grain, a corner caption naming the exact shot that belongs there. The
 * moment `src` is set, it renders the real photo with the identical shared
 * treatment (§7.2) and, for portraits, the same glint-on-hover behavior —
 * nothing else about the slot's markup or sizing changes.
 */
export function ArtSlot({
  ratio,
  theme,
  caption,
  src,
  alt = "",
  sizes = "(min-width: 1024px) 40vw, 90vw",
  kind = "default",
  initials,
  glintOnHover = false,
  className,
}: ArtSlotProps) {
  const fillClass = theme === "night" ? "bg-night-2" : "bg-morning-2";
  const captionClass = theme === "night" ? "text-ink-light-2" : "text-ink-dark-2";
  const hasPhoto = Boolean(src);

  return (
    <div
      className={cn("relative isolate overflow-hidden", fillClass, className)}
      style={{ aspectRatio: RATIO_MAP[ratio] }}
    >
      {hasPhoto ? (
        <Image src={src!} alt={alt} fill sizes={sizes} className="vv-photo-treatment object-cover" />
      ) : kind === "portrait" ? (
        <div className="flex h-full w-full items-center justify-center px-4">
          <span
            className="font-display select-none text-center leading-none"
            style={{ fontSize: "200px", color: "var(--ink-dark-2)", opacity: 0.15 }}
            aria-hidden
          >
            {initials}
          </span>
        </div>
      ) : null}

      {/* Grain — identical overlay whether the slot is empty or filled, so
          filling it never looks like a texture "upgrade". */}
      <div className="vv-grain pointer-events-none absolute inset-0" aria-hidden />

      {hasPhoto && glintOnHover ? <Glint trigger="hover" /> : null}

      {caption ? (
        <span
          className={cn(
            "absolute bottom-3 right-3 text-xs",
            hasPhoto ? "text-ink-light" : captionClass,
          )}
          style={hasPhoto ? { textShadow: "0 1px 4px rgba(0,0,0,0.6)" } : undefined}
        >
          {caption}
        </span>
      ) : null}
    </div>
  );
}
