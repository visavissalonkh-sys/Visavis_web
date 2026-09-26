"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
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

        {/* Mobile/tablet: no hover surface — a plain stacked list instead */}
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:hidden">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/services/${category.slug}`}
              className="flex flex-col justify-center gap-2 bg-surface px-8 py-10 transition-colors duration-300 hover:bg-surface-2"
            >
              <h3 className="font-display text-2xl text-fg">{category.name}</h3>
              <p className="text-sm text-fg-muted">{category.tagline}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
