"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { gsap } from "@/lib/gsap";

export type FeaturedMaster = {
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  rating: number;
  reviewCount: number;
  specialtyNames: string[];
};

// Distinct abstract gradient per position so masters don't share one identical
// "photo" placeholder — same family (gold, blurred, geometric) as Hero's
// visual, never a literal portrait shape or "image" text.
const PORTRAIT_ANGLES = [135, 200, 60, 300, 20];

export function FeaturedMasters({ masters }: { masters: FeaturedMaster[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".masters-reveal", {
        autoAlpha: 0,
        y: 30,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
      });

      // The big master name gets its own, more dramatic scroll-triggered
      // entrance — sliding in from the left — separate from the section's
      // own quiet fade-up above.
      gsap.from(".master-name", {
        x: -100,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  if (masters.length === 0) return null;
  const active = masters[activeIndex];

  return (
    <section ref={sectionRef} className="bg-cream py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            onCream
            title="Майстри, яким довіряють"
            description="Кожен майстер спеціалізується на своєму напрямку та проходить постійне підвищення кваліфікації."
          />
          <Button
            href="/masters"
            variant="outline"
            className="hidden border-on-cream text-on-cream hover:border-accent-on-cream hover:text-accent-on-cream lg:inline-flex"
          >
            Уся команда
          </Button>
        </div>

        {/* Desktop: spotlight layout — big portrait + detail + name list */}
        <div className="masters-reveal hidden gap-12 lg:grid lg:grid-cols-[1fr_1fr_auto]">
          <div
            key={`portrait-${active.slug}`}
            className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-on-cream/10 animate-fade-up"
          >
            <div
              aria-hidden
              className="absolute h-[120%] w-[120%] blur-3xl"
              style={{
                background: `radial-gradient(ellipse 60% 50% at 50% 45%, color-mix(in srgb, var(--color-accent-on-cream) 35%, transparent), transparent 70%)`,
                transform: `rotate(${PORTRAIT_ANGLES[activeIndex % PORTRAIT_ANGLES.length]}deg)`,
              }}
            />
            <div
              aria-hidden
              className="absolute h-4/5 w-4/5 rounded-[50%] border border-accent-on-cream/30"
              style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--color-accent-on-cream) 28%, transparent), transparent 75%)" }}
            />
            <span className="master-name font-display relative text-on-cream" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
              {active.name}
            </span>
          </div>

          <div key={`detail-${active.slug}`} className="flex flex-col justify-center gap-6 animate-fade-up">
            <div className="flex flex-wrap gap-2">
              {active.specialtyNames.map((name) => (
                <span key={name} className="rounded-full border border-on-cream/25 px-3 py-1 text-xs text-on-cream-muted">
                  {name}
                </span>
              ))}
            </div>

            {active.bio ? <p className="max-w-md text-lg leading-relaxed text-on-cream-muted">{active.bio}</p> : null}

            <div className="flex items-center gap-4 text-sm">
              <span className="text-on-cream">★ {active.rating.toFixed(1)}</span>
              <span className="text-on-cream-muted">{active.reviewCount} відгуків</span>
            </div>

            <Link href={`/masters/${active.slug}`} className="w-fit text-sm text-accent-on-cream hover:opacity-75">
              Профіль майстра та запис
            </Link>
          </div>

          <nav className="flex flex-col gap-3 border-l border-on-cream/15 pl-8">
            {masters.map((master, index) => (
              <button
                key={master.slug}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`whitespace-nowrap text-left font-display text-lg underline-offset-4 transition-colors hover:text-accent-on-cream hover:underline ${
                  index === activeIndex ? "text-accent-on-cream" : "text-on-cream-muted"
                }`}
              >
                {master.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile: horizontal swipe carousel, one full card per master */}
        <MobileMastersCarousel masters={masters} />

        <Button
          href="/masters"
          variant="outline"
          className="w-full border-on-cream text-on-cream hover:border-accent-on-cream hover:text-accent-on-cream lg:hidden"
        >
          Уся команда
        </Button>
      </Container>
    </section>
  );
}

function MobileMastersCarousel({ masters }: { masters: FeaturedMaster[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.firstElementChild?.clientWidth ?? 1;
    const gap = 16;
    setActiveDot(Math.round(track.scrollLeft / (cardWidth + gap)));
  }

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
      >
        {masters.map((master, index) => (
          <div
            key={master.slug}
            className="flex w-[85vw] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-on-cream/10"
          >
            <div className="relative flex h-[55%] min-h-[220px] items-center justify-center overflow-hidden">
              <div
                aria-hidden
                className="absolute h-[130%] w-[130%] blur-3xl"
                style={{
                  background: `radial-gradient(ellipse 60% 50% at 50% 45%, color-mix(in srgb, var(--color-accent-on-cream) 35%, transparent), transparent 70%)`,
                  transform: `rotate(${PORTRAIT_ANGLES[index % PORTRAIT_ANGLES.length]}deg)`,
                }}
              />
              <div
                aria-hidden
                className="absolute h-4/5 w-4/5 rounded-[50%] border border-accent-on-cream/30"
                style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--color-accent-on-cream) 28%, transparent), transparent 75%)" }}
              />
            </div>

            <div className="flex flex-1 flex-col gap-3 bg-cream-dark p-6">
              <span className="font-display text-[2rem] leading-tight text-on-cream">{master.name}</span>
              <span className="text-[0.75rem] uppercase tracking-[0.1em] text-accent-on-cream">
                {master.specialtyNames.join(" · ") || "Майстер"}
              </span>
              <Button href={`/masters/${master.slug}`} size="lg" className="mt-2 h-12 w-full bg-on-cream text-cream hover:bg-accent-on-cream">
                Записатись
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        {masters.map((_, index) => (
          <span
            key={index}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: index === activeDot ? "18px" : "6px",
              background: index === activeDot ? "var(--color-accent-on-cream)" : "color-mix(in srgb, var(--color-on-cream) 25%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
