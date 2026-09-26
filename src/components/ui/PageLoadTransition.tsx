"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

export function PageLoadTransition() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      gsap.set(ref.current, { autoAlpha: 0 });
      return;
    }
    gsap.to(ref.current, { autoAlpha: 0, duration: 0.8, ease: "power2.out", delay: 0.1 });
  }, []);

  return (
    // pointer-events-none is permanent, not something the fade-out grants at
    // the end — a purely decorative overlay must never be able to block the
    // page underneath, no matter what happens to the animation (a slow
    // device, a tab backgrounded mid-load, GSAP failing to init). Without
    // this, any delay in the tween leaves a full-viewport, high-z-index,
    // click-eating layer over the entire site.
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[200] bg-bg" />
  );
}
