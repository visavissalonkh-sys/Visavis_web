import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { masters, getMaster } from "@/lib/data/masters";
import { categories } from "@/lib/data/services";
import { locations } from "@/lib/data/locations";
import { reviews } from "@/lib/data/reviews";

export function generateStaticParams() {
  return masters.map((master) => ({ slug: master.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const master = getMaster(slug);
  if (!master) return {};

  return {
    title: master.name,
    description: `${master.role} у мережі Visavis. ${master.bio}`,
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
  const master = getMaster(slug);
  if (!master) notFound();

  const specialties = categories.filter((c) => master.specialtySlugs.includes(c.slug));
  const masterLocations = locations.filter((l) => master.locationSlugs.includes(l.slug));
  const masterReviews = reviews.filter((r) => master.specialtySlugs.includes(r.categorySlug));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: master.name,
    jobTitle: master.role,
    worksFor: { "@type": "BeautySalon", name: "Visavis" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: master.rating,
      reviewCount: master.reviewsCount,
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
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-display text-2xl text-accent">
          {initials(master.name)}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl text-fg sm:text-4xl">{master.name}</h1>
            <p className="mt-1 text-fg-muted">{master.role}</p>
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

          <p className="max-w-2xl text-fg-muted">{master.bio}</p>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-fg">★ {master.rating.toFixed(1)}</span>
            <span className="text-fg-subtle">{master.reviewsCount} відгуків</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button href={`/booking?master=${master.slug}`}>Записатися до {master.name.split(" ")[0]}</Button>
          </div>
        </div>
      </div>

      {masterLocations.length ? (
        <section className="flex flex-col gap-4 border-t border-border pt-10">
          <h2 className="font-display text-xl text-fg">Приймає у філіях</h2>
          <div className="flex flex-wrap gap-4">
            {masterLocations.map((location) => (
              <Link
                key={location.slug}
                href="/locations"
                className="rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-fg-muted hover:border-accent-border"
              >
                <div className="text-fg">{location.name}</div>
                <div className="text-xs text-fg-subtle">{location.hours}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {masterReviews.length ? (
        <section className="flex flex-col gap-4 border-t border-border pt-10">
          <h2 className="font-display text-xl text-fg">Відгуки клієнтів</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {masterReviews.map((review) => (
              <blockquote
                key={review.id}
                className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-muted"
              >
                “{review.text}”
                <footer className="mt-3 text-xs text-fg-subtle">{review.authorName}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
