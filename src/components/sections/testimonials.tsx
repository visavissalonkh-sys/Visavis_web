"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { reviews } from "@/lib/data/reviews";
import { categories } from "@/lib/data/services";
import { gsap } from "@/lib/gsap";

const AUTO_ADVANCE_MS = 6000;

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  const active = reviews[index];
  const category = categories.find((c) => c.slug === active.categorySlug);

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-t border-border py-24 sm:py-32">
      <Container className="testimonials-reveal flex flex-col items-center gap-14">
        <SectionHeading title="Що кажуть клієнтки Visavis" align="center" />

        <div
          className="relative flex w-full max-w-2xl flex-col items-center gap-8 text-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <span
            aria-hidden
            className="font-display pointer-events-none absolute -top-16 select-none leading-none text-accent"
            style={{ fontSize: "15vw", opacity: 0.05 }}
          >
            “
          </span>

          <blockquote
            key={active.id}
            className="animate-fade-up font-display relative max-w-xl text-2xl italic leading-relaxed text-fg sm:text-3xl"
          >
            {active.text}
          </blockquote>

          <figcaption key={`${active.id}-caption`} className="animate-fade-up relative flex flex-col items-center gap-1">
            <span className="text-sm text-fg">
              {active.authorName} <span className="text-xs text-accent">{"★".repeat(active.rating)}</span>
            </span>
            {category ? <span className="text-xs text-fg-subtle">{category.name}</span> : null}
          </figcaption>

          <div role="tablist" aria-label="Відгуки" className="relative flex gap-2 pt-4">
            {reviews.map((review, i) => (
              <button
                key={review.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Відгук ${i + 1} з ${reviews.length}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? "bg-accent" : "bg-border-strong hover:bg-fg-subtle"
                }`}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
