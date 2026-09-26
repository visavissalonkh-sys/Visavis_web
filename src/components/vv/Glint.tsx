"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const IDLE_INTERVAL_MS = 8000;

export type GlintTrigger = "load" | "hover" | "idle";

/**
 * The signature interaction (DESIGN.md §4) — a thin diagonal beam of light
 * sweeping once across its parent, like a reflection moving across glass.
 * Renders one absolutely-positioned overlay; the parent must be
 * `position: relative` (or similar) with `overflow: hidden` so the sweep is
 * clipped to that surface rather than bleeding across the page.
 *
 * Only three call sites exist anywhere on the site (hero headline on load,
 * a master's portrait on hover, the header CTA idling) — see DESIGN.md §4
 * for why a fourth would be the "effects without an idea" failure mode
 * repeating itself. Don't add a new trigger site without updating that doc.
 */
export function Glint({ trigger, className, disabled = false }: { trigger: GlintTrigger; className?: string; disabled?: boolean }) {
  const beamRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const beam = beamRef.current;
    if (!beam || disabled) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return; // no glint at all, not a slowed one — DESIGN.md §4

    function sweep() {
      gsap.fromTo(
        beam,
        { xPercent: -160, autoAlpha: 0 },
        { xPercent: 160, autoAlpha: 1, duration: 1.1, ease: "vv-glint" },
      );
    }

    if (trigger === "load") {
      sweep();
      return;
    }

    if (trigger === "hover") {
      const parent = beam.parentElement;
      if (!parent) return;
      parent.addEventListener("mouseenter", sweep);
      return () => parent.removeEventListener("mouseenter", sweep);
    }

    // trigger === "idle": repeats every 8s, paused while the tab is hidden —
    // DESIGN.md round-1 amendment 6. No point animating a backgrounded tab,
    // and resuming picks up the same interval rather than stacking timers.
    let interval: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (interval) return;
      interval = setInterval(sweep, IDLE_INTERVAL_MS);
    }
    function stop() {
      if (interval) clearInterval(interval);
      interval = null;
    }
    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [trigger, disabled]);

  return (
    <span
      ref={beamRef}
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0,
        pointerEvents: "none",
        background:
          "linear-gradient(75deg, transparent 40%, var(--glint) 50%, transparent 60%)",
        mixBlendMode: "soft-light",
      }}
    />
  );
}
