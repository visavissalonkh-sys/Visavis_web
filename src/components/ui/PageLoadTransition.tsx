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

  return <div ref={ref} aria-hidden className="fixed inset-0 z-[200] bg-bg" />;
}
