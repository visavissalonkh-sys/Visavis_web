import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { categories, getServicesByCategory } from "@/lib/data/services";

export const metadata: Metadata = {
  title: "Послуги",
  description:
    "Каталог послуг Visavis: волосся, нігті, косметологія, перманентний макіяж, масаж. Ціни, тривалість і запис онлайн.",
  alternates: { canonical: "/services", languages: { "uk-UA": "/services" } },
};

export default function ServicesPage() {
  return (
    <Container className="flex flex-col gap-16 py-20">
      <SectionHeading
        title="Усі послуги Visavis"
        description="П’ять напрямків краси в одному просторі — оберіть категорію, щоб побачити повний перелік послуг і цін."
      />

      <div className="flex flex-col gap-16">
        {categories.map((category) => {
          const categoryServices = getServicesByCategory(category.slug);

          return (
            <section key={category.slug} className="flex flex-col gap-6">
              <div className="flex flex-col items-start justify-between gap-3 border-b border-border pb-6 sm:flex-row sm:items-end">
                <div>
                  <h2 className="font-display text-2xl text-fg sm:text-3xl">
                    {category.name}
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">{category.description}</p>
                </div>
                <Link
                  href={`/services/${category.slug}`}
                  className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  Усі послуги напрямку
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {categoryServices.map((service) => (
                  <div
                    key={service.slug}
                    className="flex items-start justify-between gap-6 rounded-2xl border border-border bg-surface p-6"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-fg">{service.name}</span>
                      <span className="text-xs text-fg-subtle">
                        {service.durationMinutes} хв
                      </span>
                    </div>
                    <span className="whitespace-nowrap text-sm text-accent">
                      від {service.priceFrom} ₴
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Container>
  );
}
