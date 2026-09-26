"use client";

import { useLayoutEffect, useRef } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/data/services";
import { gsap } from "@/lib/gsap";

const SECOND_LINE = "доведена до досконалості".split(" ");

export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set(".hero-line, .hero-word, .hero-subhead, .hero-cta, .hero-visual, .hero-visual-mobile", {
          opacity: 1,
          clearProps: "transform",
        });
        return;
      }

      // Same entrance, just tighter on mobile — there's less scroll distance
      // before it, so a slower reveal reads as sluggish rather than grand.
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      const scale = isMobile ? 0.75 : 1; // 0.6s / 0.8s

      // The one deliberate motion moment on the page — everything after this
      // (other sections) gets a quieter scroll-triggered fade, never a second
      // choreographed sequence like this one.
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".hero-visual-mobile", { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.6 * scale })
        .fromTo(".hero-line", { scaleY: 0 }, { scaleY: 1, duration: 0.5 * scale }, "-=0.3")
        .from(".hero-word", { y: -40, autoAlpha: 0, duration: 0.6 * scale, stagger: 0.08 }, "-=0.15")
        .from(".hero-subhead", { autoAlpha: 0, y: 14, duration: 0.6 * scale }, "-=0.45")
        .from(".hero-cta", { autoAlpha: 0, y: 10, duration: 0.5 * scale }, "-=0.35")
        .from(".hero-visual", { autoAlpha: 0, scale: 0.94, duration: 1 * scale }, "-=0.9");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="overflow-hidden border-b border-border">
      <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Mobile-only composition: golden circles fill the top ~40% instead
          of sitting beside the text like the desktop split layout. */}
      <div className="hero-visual-mobile relative flex h-[38svh] items-center justify-center lg:hidden" aria-hidden>
        <div
          className="absolute h-[85%] w-[85%] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 48%, transparent), transparent 70%)",
          }}
        />
        <div
          className="absolute h-52 w-52 rounded-full border border-accent-border"
          style={{ transform: "translate(-24px, -12px)" }}
        />
        <div
          className="absolute h-40 w-40 rounded-full"
          style={{
            background: "linear-gradient(135deg, var(--color-accent), transparent 70%)",
            opacity: 0.65,
            filter: "blur(1px)",
            transform: "translate(28px, 20px)",
          }}
        />
      </div>

      <Container className="grid min-h-[62svh] items-center gap-16 py-12 lg:min-h-[88vh] lg:grid-cols-[55%_45%] lg:py-24">
        <div className="flex items-start gap-6">
          <span className="hero-line mt-3 h-[60px] w-px shrink-0 origin-top bg-accent" />

          <div className="flex flex-col gap-8">
            <h1
              className="font-display text-[clamp(2.5rem,8vw,3.5rem)] leading-[0.98] text-fg lg:text-[clamp(2.75rem,8vw,6rem)]"
            >
              <span className="block overflow-hidden pb-1">
                <span className="hero-word inline-block" style={{ fontWeight: 300 }}>
                  Краса,
                </span>
              </span>
              <span className="block overflow-hidden pb-1">
                {SECOND_LINE.map((word, i) => (
                  <span key={word} className={i > 0 ? "ml-[0.28em] inline-block overflow-hidden" : "inline-block overflow-hidden"}>
                    <span className="hero-word inline-block italic" style={{ fontWeight: 600 }}>
                      {word}
                    </span>
                  </span>
                ))}
              </span>
            </h1>

            <p className="hero-subhead hidden max-w-md text-lg leading-relaxed text-fg-muted lg:block">
              Волосся, нігті, косметологія, перманентний макіяж і масаж — в одному
              просторі, де кожна деталь продумана заради вашого результату.
            </p>

            <div className="hero-cta w-full lg:w-auto">
              <Button
                href="/booking"
                variant="outline"
                size="lg"
                className="h-[52px] w-full rounded-none border-accent-border text-accent hover:text-accent-hover lg:h-auto lg:w-fit"
              >
                Записатися
              </Button>
            </div>
          </div>
        </div>

        <div className="hero-visual relative hidden aspect-square items-center justify-center lg:flex" aria-hidden>
          <div
            className="absolute h-[80%] w-[80%] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 48%, transparent), transparent 70%)",
            }}
          />
          <div
            className="absolute h-80 w-80 rounded-full border border-accent-border"
            style={{ transform: "translate(-48px, -36px)" }}
          />
          <div
            className="absolute h-60 w-60 rounded-full"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), transparent 70%)",
              opacity: 0.65,
              filter: "blur(1px)",
              transform: "translate(56px, 44px)",
            }}
          />
        </div>
      </Container>

      <a
        href="#categories"
        className="absolute inset-x-0 bottom-6 hidden flex-col items-center gap-2 text-xs text-fg-subtle transition-colors hover:text-fg sm:flex"
      >
        гортайте
        <span className="h-8 w-px bg-border-strong" />
      </a>
      </div>

      <div className="relative border-y border-border bg-surface py-4">
        <div className="no-scrollbar flex w-max animate-marquee gap-12 whitespace-nowrap">
          {[...categories, ...categories].map((category, i) => (
            <span
              key={`${category.slug}-${i}`}
              className="font-display text-xl text-fg-subtle sm:text-2xl"
            >
              {category.name}
              <span className="ml-12 text-accent">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
