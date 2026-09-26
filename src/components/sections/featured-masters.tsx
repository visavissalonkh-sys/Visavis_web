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
        y: 20,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  if (masters.length === 0) return null;
  const active = masters[activeIndex];

  return (
    <section ref={sectionRef} className="border-t border-border py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            title="Майстри, яким довіряють"
            description="Кожен майстер спеціалізується на своєму напрямку та проходить постійне підвищення кваліфікації."
          />
          <Button href="/masters" variant="outline">
            Уся команда
          </Button>
        </div>

        <div className="masters-reveal grid gap-12 lg:grid-cols-[1fr_1fr_auto]">
          <div key={`portrait-${active.slug}`} className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-border animate-fade-up">
            <div
              aria-hidden
              className="absolute h-[120%] w-[120%] blur-3xl"
              style={{
                background: `radial-gradient(ellipse 60% 50% at 50% 45%, color-mix(in srgb, var(--color-accent) 45%, transparent), transparent 70%)`,
                transform: `rotate(${PORTRAIT_ANGLES[activeIndex % PORTRAIT_ANGLES.length]}deg)`,
              }}
            />
            <div
              aria-hidden
              className="absolute h-3/5 w-3/5 rounded-[50%] border border-accent-border"
              style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 75%)" }}
            />
            <span className="font-display relative text-fg" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
              {active.name}
            </span>
          </div>

          <div key={`detail-${active.slug}`} className="flex flex-col justify-center gap-6 animate-fade-up">
            <div className="flex flex-wrap gap-2">
              {active.specialtyNames.map((name) => (
                <span key={name} className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle">
                  {name}
                </span>
              ))}
            </div>

            {active.bio ? <p className="max-w-md text-lg leading-relaxed text-fg-muted">{active.bio}</p> : null}

            <div className="flex items-center gap-4 text-sm">
              <span className="text-fg">★ {active.rating.toFixed(1)}</span>
              <span className="text-fg-subtle">{active.reviewCount} відгуків</span>
            </div>

            <Link href={`/masters/${active.slug}`} className="w-fit text-sm text-accent hover:text-accent-hover">
              Профіль майстра та запис
            </Link>
          </div>

          <nav className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-3 lg:overflow-visible lg:border-l lg:border-border lg:pl-8">
            {masters.map((master, index) => (
              <button
                key={master.slug}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`whitespace-nowrap text-left font-display text-lg transition-colors ${
                  index === activeIndex ? "text-accent" : "text-fg-subtle hover:text-fg"
                }`}
              >
                {master.name}
              </button>
            ))}
          </nav>
        </div>
      </Container>
    </section>
  );
}
