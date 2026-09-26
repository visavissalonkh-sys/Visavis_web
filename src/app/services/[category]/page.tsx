import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { getCategory, getServicesByCategory } from "@/lib/data/services";
import { prisma } from "@/lib/prisma";

// Not SSG: the page body queries Prisma for categoryMasters, which needs the
// DB reachable at build time — Railway's build step doesn't guarantee that
// (see /masters/[slug]/page.tsx). generateStaticParams itself only needed
// the static `categories` list, but there's no point keeping it once the
// page can't be prerendered anyway.
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visavis.example";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  const path = `/services/${slug}`;
  return {
    title: category.name,
    description: `${category.description} Записатися онлайн до майстрів Visavis у Харкові.`,
    alternates: { canonical: path, languages: { "uk-UA": path } },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const categoryServices = getServicesByCategory(slug);
  const categoryMasters = await prisma.master.findMany({
    where: { isActive: true, specialties: { some: { service: { category: slug } } } },
    orderBy: { name: "asc" },
  });
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: category.name,
    provider: { "@type": "BeautySalon", name: "Visavis" },
    areaServed: "Харків",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: category.name,
      itemListElement: categoryServices.map((service) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: service.name },
        price: service.priceFrom,
        priceCurrency: "UAH",
      })),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Головна", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Послуги", item: `${siteUrl}/services` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${siteUrl}/services/${slug}` },
    ],
  };

  return (
    <Container className="flex flex-col gap-16 py-20">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="flex flex-col gap-4">
        <Link href="/services" className="text-sm text-fg-muted hover:text-fg">
          ← Усі послуги
        </Link>
        <SectionHeading title={category.name} description={category.description} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {categoryServices.map((service) => (
          <div
            key={service.slug}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-lg text-fg">{service.name}</h3>
              <span className="whitespace-nowrap text-sm text-accent">
                від {service.priceFrom} ₴{service.priceTo ? ` до ${service.priceTo} ₴` : ""}
              </span>
            </div>
            <p className="text-sm text-fg-muted">{service.description}</p>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-fg-subtle">{service.durationMinutes} хв</span>
              <Button href={`/booking?service=${service.slug}`} size="md">
                Записатися
              </Button>
            </div>
          </div>
        ))}
      </section>

      {categoryMasters.length ? (
        <section className="flex flex-col gap-6">
          <h2 className="font-display text-2xl text-fg">Майстри напрямку</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryMasters.map((master) => (
              <Link
                key={master.slug}
                href={`/masters/${master.slug}`}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent-border"
              >
                <span className="font-display text-lg text-fg">{master.name}</span>
                <span className="text-sm text-fg-muted">{category.tagline}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
