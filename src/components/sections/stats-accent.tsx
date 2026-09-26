"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setValue(target);
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        if (hasRun.current) return;
        hasRun.current = true;
        const counter = { n: 0 };
        gsap.to(counter, {
          n: target,
          duration: 1.4,
          ease: "power1.out",
          onUpdate: () => setValue(Math.round(counter.n)),
        });
      },
    });
    return () => trigger.kill();
  }, [target]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

/**
 * A thin, dark accent strip between Masters (cream) and Testimonials
 * (cream) — a deliberate dark beat so two light sections don't run
 * together into one long pale block.
 */
export function StatsAccent({ masterCount, locationCount }: { masterCount: number; locationCount: number }) {
  return (
    <section className="bg-bg py-8">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6 text-center font-sans text-sm uppercase tracking-[0.2em] text-fg-muted opacity-70 sm:text-base">
        {/* "500+ клієнтів" is illustrative copy, not a verified figure — flagged
            for the client to confirm or replace with a real number. */}
        <span>
          <Counter target={500} suffix="+" /> задоволених клієнтів
        </span>
        <span className="text-accent">·</span>
        <span>
          <Counter target={masterCount} /> майстр{masterCount === 1 ? "" : "ів"}
        </span>
        <span className="text-accent">·</span>
        <span>
          <Counter target={locationCount} /> філіал{locationCount === 1 ? "" : "и"}
        </span>
      </div>
    </section>
  );
}
