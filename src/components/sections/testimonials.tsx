"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { reviews } from "@/lib/data/reviews";
import { categories } from "@/lib/data/services";
import { gsap } from "@/lib/gsap";

const AUTO_ADVANCE_MS = 6000;
const SWIPE_THRESHOLD_PX = 50;

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".testimonials-reveal", {
        autoAlpha: 0,
        y: 20,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % reviews.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  function handleTouchStart(e: React.TouchEvent) {
    setPaused(true);
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -SWIPE_THRESHOLD_PX) setIndex((i) => (i + 1) % reviews.length);
    else if (delta > SWIPE_THRESHOLD_PX) setIndex((i) => (i - 1 + reviews.length) % reviews.length);
    setPaused(false);
  }

  const active = reviews[index];
  const category = categories.find((c) => c.slug === active.categorySlug);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-24 sm:py-32"
      style={{ background: "linear-gradient(to bottom, var(--color-cream), var(--color-cream-dark))" }}
    >
      <Container className="testimonials-reveal flex flex-col items-center gap-14">
        <SectionHeading onCream title="Що кажуть клієнтки Visavis" align="center" />

        <div
          className="relative flex w-full max-w-2xl flex-col items-center gap-8 text-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <span
            aria-hidden
            className="font-display pointer-events-none absolute -top-10 select-none text-[8rem] leading-none text-accent-on-cream sm:-top-16 sm:text-[15vw]"
            style={{ opacity: 0.12 }}
          >
            “
          </span>

          <blockquote
            key={active.id}
            className="animate-fade-up font-display relative max-w-xl text-[1.1rem] italic leading-relaxed text-on-cream sm:text-3xl"
          >
            {active.text}
          </blockquote>

          <figcaption key={`${active.id}-caption`} className="animate-fade-up relative flex items-center gap-3">
            <span className="h-6 w-px bg-accent-on-cream" aria-hidden />
            <span className="flex flex-col items-start text-left">
              <span className="text-sm text-on-cream">
                {active.authorName} <span className="text-xs text-accent-on-cream">{"★".repeat(active.rating)}</span>
              </span>
              {category ? <span className="text-xs text-on-cream-muted">{category.name}</span> : null}
            </span>
          </figcaption>

          <div role="tablist" aria-label="Відгуки" className="relative flex pt-4">
            {reviews.map((review, i) => (
              <button
                key={review.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Відгук ${i + 1} з ${reviews.length}`}
                onClick={() => setIndex(i)}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full transition-colors"
                  style={{
                    background:
                      i === index ? "var(--color-accent-on-cream)" : "color-mix(in srgb, var(--color-on-cream) 20%, transparent)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
