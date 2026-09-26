"use client";

import { useLayoutEffect, useRef } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { categories } from "@/lib/data/services";
import { gsap } from "@/lib/gsap";

const SECOND_LINE = "доведена до досконалості".split(" ");

export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set(".hero-line, .hero-word, .hero-subhead, .hero-cta, .hero-visual", { opacity: 1, clearProps: "transform" });
        return;
      }

      // The one deliberate motion moment on the page — everything after this
      // (other sections) gets a quieter scroll-triggered fade, never a second
      // choreographed sequence like this one.
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".hero-line", { scaleY: 0 }, { scaleY: 1, duration: 0.5 })
        .from(".hero-word", { y: -40, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, "-=0.15")
        .from(".hero-subhead", { autoAlpha: 0, y: 14, duration: 0.6 }, "-=0.45")
        .from(".hero-cta", { autoAlpha: 0, y: 10, duration: 0.5 }, "-=0.35")
        .from(".hero-visual", { autoAlpha: 0, scale: 0.94, duration: 1 }, "-=0.9");
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
      <Container className="grid min-h-[88vh] items-center gap-16 py-24 lg:grid-cols-[55%_45%]">
        <div className="flex items-start gap-6">
          <span className="hero-line mt-3 h-[60px] w-px shrink-0 origin-top bg-accent" />

          <div className="flex flex-col gap-8">
            <h1
              className="font-display text-fg"
              style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)", lineHeight: 0.98 }}
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

            <p className="hero-subhead max-w-md text-lg leading-relaxed text-fg-muted">
              Волосся, нігті, косметологія, перманентний макіяж і масаж — в одному
              просторі, де кожна деталь продумана заради вашого результату.
            </p>

            <div className="hero-cta">
              <MagneticButton>
                <Button
                  href="/booking"
                  variant="outline"
                  size="lg"
                  className="w-fit rounded-none border-accent-border text-accent hover:text-accent-hover"
                >
                  Записатися
                </Button>
              </MagneticButton>
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
