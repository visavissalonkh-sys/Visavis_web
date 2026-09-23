import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { categories } from "@/lib/data/services";

export function CategoriesStrip() {
  return (
    <section className="py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Напрямки"
          title="П’ять напрямків, один стандарт якості"
          description="Кожна категорія — окрема команда майстрів, підібраний догляд і преміальні матеріали."
        />

        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category, index) => (
            <Reveal key={category.slug} delay={index * 60}>
              <Link
                href={`/services/${category.slug}`}
                className="group relative flex h-full flex-col justify-between gap-10 bg-surface p-8 transition-colors duration-300 hover:bg-surface-2"
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-sm text-fg-subtle">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    →
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-2xl text-fg">{category.name}</h3>
                  <p className="text-sm text-fg-muted">{category.tagline}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
