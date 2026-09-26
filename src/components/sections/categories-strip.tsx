import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { categories } from "@/lib/data/services";

export function CategoriesStrip() {
  return (
    <section className="py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          title="П’ять напрямків, один стандарт якості"
          description="Кожна категорія — окрема команда майстрів, підібраний догляд і преміальні матеріали."
        />

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/services/${category.slug}`}
              className="group flex h-full flex-col justify-center gap-2 bg-surface px-8 py-10 transition-colors duration-300 hover:bg-surface-2"
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
