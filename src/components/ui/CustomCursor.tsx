"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

// Only on real pointer devices with no reduced-motion preference — a
// synthetic cursor over a touchscreen or against explicit user preference
// is a bug, not a feature.
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const canHover = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reducedMotion) return;

    setEnabled(true);
    document.body.classList.add("custom-cursor-active");
    return () => document.body.classList.remove("custom-cursor-active");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    if (!dot) return;

    gsap.set(dot, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      scale: 1,
      mixBlendMode: "difference",
    });

    function handleMove(e: MouseEvent) {
      gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
    }

    // Delegated on document (not bound per-element) so it keeps working as
    // React adds/removes interactive elements — no re-binding needed.
    const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, [role='button']";
    function handleOver(e: MouseEvent) {
      if ((e.target as HTMLElement)?.closest(INTERACTIVE_SELECTOR)) {
        gsap.to(dot, { scale: 1.5, mixBlendMode: "difference", duration: 0.25, ease: "power2.out" });
      }
    }
    function handleOut(e: MouseEvent) {
      const leavingInteractive = (e.target as HTMLElement)?.closest(INTERACTIVE_SELECTOR);
      const enteringInteractive = (e.relatedTarget as HTMLElement | null)?.closest?.(INTERACTIVE_SELECTOR);
      if (leavingInteractive && !enteringInteractive) {
        gsap.to(dot, { scale: 1, duration: 0.25, ease: "power2.out" });
      }
    }

    window.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] h-5 w-5 rounded-full bg-accent opacity-70 mix-blend-difference"
    />
  );
}
