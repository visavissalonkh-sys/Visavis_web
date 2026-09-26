"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { VvButton } from "@/components/vv/Button";
import { SectionTheme } from "@/components/vv/SectionTheme";
import { MirrorLine, Reflection } from "@/components/vv/MirrorLine";
import { Glint } from "@/components/vv/Glint";
import { gsap } from "@/lib/gsap";

const RIGHT_WORDS = ["доведена", "до", "досконалості"];

/**
 * DESIGN.md §6.1. The site's one choreographed moment — every other section
 * gets a quieter scroll-triggered fade, never a second full intro sequence.
 *
 * Implementation note (disclosed simplification): DESIGN.md's intro-sequence
 * prose names split-type for the word split. The headline here is two short,
 * known-at-build-time strings, so plain per-word spans give the identical
 * staggered reveal without a DOM-mutating library running after first paint
 * (and the FOUC risk that comes with restructuring text post-hydration) —
 * the same "simpler primitive, identical result" trade already made for
 * ThemeSeam in §5. split-type stays installed for Manifesto (§6.2), where
 * the text is a real paragraph worth splitting generically.
 */
export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [glintReady, setGlintReady] = useState(false);

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(
          ".hero-word-left, .hero-word-right, .hero-word-mobile-top, .hero-word-mobile-bottom, .hero-cta-group, .hero-cta-group-mobile",
          { opacity: 1, clearProps: "transform" },
        );
        setGlintReady(true);
        return;
      }

      // MirrorLine draws itself on mount (600ms, vv-out) — this timeline's
      // 0.6s delay is that same duration, so the headline only starts
      // assembling once the line has finished, per §6.1's stated order.
      const tl = gsap.timeline({ delay: 0.6, defaults: { ease: "vv-out" } });

      // Desktop: each half slides in FROM the center line OUTWARD to its
      // resting position — the line is what the headline is "unfolding"
      // away from, the same idea the Masters fold-transition reuses later.
      tl.fromTo(".hero-word-left", { x: 48, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5 })
        .fromTo(
          ".hero-word-right",
          { x: -48, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 },
          "<",
        )
        // Mobile: the opposite spatial move by design — the two lines
        // converge ONTO the horizontal line between them (top comes down,
        // bottom comes up), since there's no "line the reader started at"
        // the way the desktop split has one either side of a vertical line.
        .fromTo(".hero-word-mobile-top", { y: -24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, "<")
        .fromTo(
          ".hero-word-mobile-bottom",
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5 },
          "<",
        )
        .call(() => setGlintReady(true))
        // Held back until the glint has had room to read — the CTA is the
        // thing the whole sequence is building toward, not another element
        // competing with the headline for the same first second.
        .fromTo(".hero-cta-group", { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, "+=0.4")
        .fromTo(".hero-cta-group-mobile", { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, "<");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <SectionTheme
      as="section"
      theme="night"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-[5vw] py-20"
    >
      <div ref={rootRef} className="flex w-full flex-col items-center">
        {/* Desktop — mirrored two-line headline either side of a vertical line. */}
        <div className="relative hidden w-full max-w-[1400px] lg:block">
          <div className="relative overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-[4vw]">
              <h1 className="text-right font-display text-[clamp(2.75rem,7vw,7.5rem)] leading-[0.98] tracking-[-0.02em]">
                <span className="hero-word-left inline-block" style={{ fontWeight: 300 }}>
                  Краса,
                </span>
              </h1>

              <MirrorLine orientation="vertical" className="h-[clamp(8rem,22vh,16rem)]" />

              <h1 className="text-left font-display text-[clamp(2.75rem,7vw,7.5rem)] leading-[0.98] tracking-[-0.02em] italic">
                {RIGHT_WORDS.map((word, i) => (
                  <span key={word} className={i > 0 ? "ml-[0.28em] inline-block" : "inline-block"}>
                    <span className="hero-word-right inline-block" style={{ fontWeight: 500 }}>
                      {word}
                    </span>
                  </span>
                ))}
              </h1>
            </div>
            {/* Sweeps once across the assembled headline, not the button —
                DESIGN.md §4's "hero headline, on load" fire site. */}
            {glintReady && <Glint trigger="load" />}
          </div>

          <Reflection className="mt-2 grid grid-cols-[1fr_auto_1fr] items-start gap-x-[4vw]">
            <span className="text-right font-display text-[clamp(2.75rem,7vw,7.5rem)] leading-[0.98] tracking-[-0.02em]" style={{ fontWeight: 300 }}>
              Краса,
            </span>
            <span className="w-px" />
            <span className="text-left font-display text-[clamp(2.75rem,7vw,7.5rem)] leading-[0.98] tracking-[-0.02em] italic" style={{ fontWeight: 500 }}>
              {RIGHT_WORDS.join(" ")}
            </span>
          </Reflection>
        </div>

        {/* Mobile — stacked lines, horizontal line between them, reflection
            under the bottom line only (DESIGN.md §6.1 round-1 amendment). */}
        <div className="flex w-full flex-col items-center gap-6 lg:hidden">
          <div className="relative w-full overflow-hidden">
            <div className="flex flex-col items-center gap-6">
              <h1 className="text-center font-display text-[clamp(2.5rem,11vw,4rem)] leading-[0.98] tracking-[-0.02em]">
                <span className="hero-word-mobile-top inline-block" style={{ fontWeight: 300 }}>
                  Краса,
                </span>
              </h1>

              <MirrorLine orientation="horizontal" className="max-w-[220px]" />

              <h1 className="text-center font-display text-[clamp(2.5rem,11vw,4rem)] leading-[0.98] tracking-[-0.02em] italic">
                <span className="hero-word-mobile-bottom inline-block" style={{ fontWeight: 500 }}>
                  {RIGHT_WORDS.join(" ")}
                </span>
              </h1>
            </div>
            {/* Same fire site as desktop — one headline, one sweep. */}
            {glintReady && <Glint trigger="load" />}
          </div>

          <Reflection className="text-center">
            <span
              className="font-display text-[clamp(2.5rem,11vw,4rem)] leading-[0.98] tracking-[-0.02em] italic"
              style={{ fontWeight: 500 }}
            >
              {RIGHT_WORDS.join(" ")}
            </span>
          </Reflection>
        </div>

        {/* One button. Nothing else competes for attention on this screen. */}
        <div className="hero-cta-group mt-16 hidden flex-col items-center gap-4 lg:flex">
          <div className="relative overflow-hidden rounded-full">
            <VvButton href="/booking" theme="night">
              Записатися
            </VvButton>
          </div>
          <span className="text-sm text-ink-light-2">Сумська · Павлове Поле</span>
        </div>

        <div className="hero-cta-group-mobile mt-12 flex flex-col items-center gap-4 lg:hidden">
          <div className="relative w-full max-w-xs overflow-hidden rounded-full">
            <VvButton href="/booking" theme="night" className="w-full">
              Записатися
            </VvButton>
          </div>
          <span className="text-sm text-ink-light-2">Сумська · Павлове Поле</span>
        </div>
      </div>
    </SectionTheme>
  );
}
