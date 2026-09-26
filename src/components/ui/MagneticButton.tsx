"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";

const MAX_PULL_PX = 15;

// Wraps any button/link so it visually pulls toward the cursor on hover.
// No-op on touch (no mousemove without a pointer), which is the correct
// fallback — the wrapped child still works as a plain link either way.
export function MagneticButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    const x = Math.max(-MAX_PULL_PX, Math.min(MAX_PULL_PX, relX * 0.4));
    const y = Math.max(-MAX_PULL_PX, Math.min(MAX_PULL_PX, relY * 0.4));
    gsap.to(el, { x, y, duration: 0.3, ease: "power2.out" });
  }

  function handleMouseLeave() {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block will-change-transform ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
