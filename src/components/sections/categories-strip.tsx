"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { categories, getServicesByCategory } from "@/lib/data/services";
import { gsap } from "@/lib/gsap";

// Subtle per-panel background so five identical surfaces don't read as one
// flat block — alternating a hair's-width lighter tint, not a texture image.
const PANEL_TINTS = [
  "var(--color-surface)",
  "color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2))",
  "var(--color-surface)",
  "color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2))",
  "var(--color-surface)",
];

export function CategoriesStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".panels-reveal", {
        autoAlpha: 0,
        y: 20,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="categories" ref={sectionRef} className="py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          title="П’ять напрямків, один стандарт якості"
          description="Кожна категорія — окрема команда майстрів, підібраний догляд і преміальні матеріали."
        />

        {/* Desktop: hover/focus-expand panels (pure CSS interaction) */}
        <div className="panels-reveal services-panels hidden overflow-hidden rounded-2xl border border-border lg:flex lg:h-[30rem]">
          {categories.map((category, index) => {
            const services = getServicesByCategory(category.slug).slice(0, 4);
            return (
              <div
                key={category.slug}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/services/${category.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/services/${category.slug}`);
                }}
                className="services-panel relative cursor-pointer overflow-hidden border-r border-border outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                style={{ background: PANEL_TINTS[index] }}
              >
                <div className="services-panel-glow pointer-events-none absolute inset-0" aria-hidden />

                <div className="services-panel-label absolute inset-0 flex items-center justify-center">
                  <span
                    className="font-display whitespace-nowrap text-2xl text-fg"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    {category.name}
                  </span>
                </div>

                <div className="services-panel-detail absolute inset-0 flex flex-col justify-center gap-4 px-8">
                  <h3 className="font-display text-2xl text-fg">{category.name}</h3>
                  <div className="flex flex-col gap-3">
                    {services.map((service) => (
                      <Link
                        key={service.slug}
                        href={`/services/${category.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between gap-4 text-sm text-fg-muted transition-colors hover:text-fg"
                      >
                        <span>{service.name}</span>
                        <span className="whitespace-nowrap text-accent">від {service.priceFrom} ₴</span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/services/${category.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 w-fit text-sm text-accent hover:text-accent-hover"
                  >
                    Усі послуги напрямку
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile/tablet: no hover surface to expand on tap — a vertical
            accordion instead, one category open at a time. */}
        <MobileCategoriesAccordion />
      </Container>
    </section>
  );
}

function MobileCategoriesAccordion() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const category of categories) {
      const panel = panelRefs.current[category.slug];
      if (!panel) continue;
      const isOpen = openSlug === category.slug;

      if (reducedMotion) {
        gsap.set(panel, { height: isOpen ? "auto" : 0 });
        continue;
      }

      // Height can't be animated to "auto" directly in CSS/GSAP — measure
      // the panel's natural (scrollHeight) height and tween to that instead,
      // then let it settle back to "auto" so content changes (rare, but
      // e.g. a font loading late) don't get clipped at a stale pixel value.
      if (isOpen) {
        const target = panel.scrollHeight;
        gsap.fromTo(
          panel,
          { height: 0 },
          { height: target, duration: 0.4, ease: "power2.out", onComplete: () => gsap.set(panel, { height: "auto" }) },
        );
      } else {
        gsap.to(panel, { height: 0, duration: 0.3, ease: "power2.in" });
      }
    }
  }, [openSlug]);

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      {categories.map((category) => {
        const services = getServicesByCategory(category.slug);
        const isOpen = openSlug === category.slug;
        return (
          <div
            key={category.slug}
            className={`overflow-hidden rounded-2xl border bg-surface transition-colors ${
              isOpen ? "border-accent-border" : "border-border"
            }`}
            style={isOpen ? { borderLeftWidth: 3, borderLeftColor: "var(--color-accent)" } : undefined}
          >
            <button
              type="button"
              onClick={() => setOpenSlug(isOpen ? null : category.slug)}
              aria-expanded={isOpen}
              className="flex min-h-[56px] w-full items-center justify-between gap-4 px-6 py-4 text-left"
            >
              <span className="font-display text-lg text-fg">{category.name}</span>
              <span
                className="text-fg-subtle transition-transform duration-300"
                style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                aria-hidden
              >
                ∨
              </span>
            </button>

            <div
              ref={(el) => {
                panelRefs.current[category.slug] = el;
              }}
              className="overflow-hidden"
              style={{ height: 0 }}
            >
              <div className="flex flex-col gap-4 px-6 pb-6">
                {services.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${category.slug}`}
                    className="flex min-h-[44px] items-center justify-between gap-4 text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    <span>{service.name}</span>
                    <span className="whitespace-nowrap text-accent">від {service.priceFrom} ₴</span>
                  </Link>
                ))}
                <Button href={`/booking?category=${category.slug}`} size="lg" className="mt-1 h-11 w-full">
                  Записатись на послугу
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
