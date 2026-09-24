import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { categories } from "@/lib/data/services";

export const revalidate = 60;

export async function generateStaticParams() {
  const masters = await prisma.master.findMany({ where: { isActive: true }, select: { slug: true } });
  return masters.map((m) => ({ slug: m.slug }));
}

async function getMasterBySlug(slug: string) {
  return prisma.master.findFirst({
    where: { slug, isActive: true },
    include: {
      specialties: { include: { service: true } },
      masterLocations: { include: { location: true }, distinct: ["locationId"] },
      reviews: { where: { isPublished: true }, include: { client: true }, orderBy: { createdAt: "desc" }, take: 6 },
      _count: { select: { reviews: { where: { isPublished: true } } } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const master = await getMasterBySlug(slug);
  if (!master) return {};

  return {
    title: master.name,
    description: master.bio ?? `${master.name} у мережі Visavis.`,
  };
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default async function MasterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const master = await getMasterBySlug(slug);
  if (!master) notFound();

  const specialtyCategorySlugs = [...new Set(master.specialties.map((s) => s.service.category))];
  const specialties = categories.filter((c) => specialtyCategorySlugs.includes(c.slug));
  const masterLocations = master.masterLocations.map((ml) => ml.location);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: master.name,
    worksFor: { "@type": "BeautySalon", name: "Visavis" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(master.ratingCached),
      reviewCount: master._count.reviews,
    },
  };

  return (
    <Container className="flex flex-col gap-14 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/masters" className="text-sm text-fg-muted hover:text-fg">
        ← Уся команда
      </Link>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft">
          {master.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
            <img src={master.avatarUrl} alt={master.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-2xl text-accent">{initials(master.name)}</span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl text-fg sm:text-4xl">{master.name}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span
                key={s.slug}
                className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle"
              >
                {s.name}
              </span>
            ))}
          </div>

          {master.bio ? <p className="max-w-2xl text-fg-muted">{master.bio}</p> : null}

          <div className="flex items-center gap-4 text-sm">
            <span className="text-fg">★ {Number(master.ratingCached).toFixed(1)}</span>
            <span className="text-fg-subtle">{master._count.reviews} відгуків</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button href={`/booking?master=${master.slug}`}>Записатися до {master.name.split(" ")[0]}</Button>
            {master.instagramUrl ? (
              <a
                href={master.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center text-sm text-accent hover:text-accent-hover"
              >
                Instagram
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {masterLocations.length ? (
        <section className="flex flex-col gap-4 border-t border-border pt-10">
          <h2 className="font-display text-xl text-fg">Приймає у філіях</h2>
          <div className="flex flex-wrap gap-4">
            {masterLocations.map((location) => (
              <Link
                key={location.id}
                href="/locations"
                className="rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-fg-muted hover:border-accent-border"
              >
                <div className="text-fg">{location.name}</div>
                <div className="text-xs text-fg-subtle">{location.address}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {master.reviews.length ? (
        <section className="flex flex-col gap-4 border-t border-border pt-10">
          <h2 className="font-display text-xl text-fg">Відгуки клієнтів</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {master.reviews.map((review) => (
              <blockquote
                key={review.id}
                className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-muted"
              >
                “{review.text}”
                <footer className="mt-3 text-xs text-fg-subtle">{review.client.name ?? "Клієнтка"}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
