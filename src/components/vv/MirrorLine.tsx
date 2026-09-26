"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * The mirror's edge — a 1px line that draws itself once (scale from 0 to 1
 * along its own length), used as the hero's center divider and reused,
 * functionally rather than decoratively, as the Masters pin's fold-
 * transition axis (DESIGN.md §6.4).
 */
export function MirrorLine({
  orientation = "vertical",
  className,
  animate = true,
}: {
  orientation?: "vertical" | "horizontal";
  className?: string;
  animate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !animate) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prop = orientation === "vertical" ? "scaleY" : "scaleX";

    if (reducedMotion) {
      gsap.set(el, { [prop]: 1, autoAlpha: 1 });
      return;
    }
    gsap.fromTo(
      el,
      { [prop]: 0, autoAlpha: 0 },
      { [prop]: 1, autoAlpha: 1, duration: 0.6, ease: "vv-out" },
    );
  }, [orientation, animate]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "bg-current",
        orientation === "vertical" ? "h-full w-px origin-top" : "h-px w-full origin-left",
        className,
      )}
    />
  );
}

/**
 * A faint mirror-image of its child — used once, under the hero headline
 * (desktop: both lines; mobile: the bottom line only, per DESIGN.md's
 * round-1 mobile-hero amendment). `aria-hidden` because it's a visual echo
 * of content a screen reader has already announced once.
 */
export function Reflection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
      style={{
        transform: "scaleY(-1)",
        opacity: 0.06,
        maskImage: "linear-gradient(to bottom, black, transparent 75%)",
        WebkitMaskImage: "linear-gradient(to bottom, black, transparent 75%)",
      }}
    >
      {children}
    </div>
  );
}
