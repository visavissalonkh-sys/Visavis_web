import type { Metadata } from "next";
import { headers } from "next/headers";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAllPublishedReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Відгуки",
  description: "Відгуки клієнтів мережі салонів краси Visavis у Харкові.",
  alternates: { canonical: "/reviews", languages: { "uk-UA": "/reviews" } },
};

export default async function ReviewsPage() {
  const { reviews, averageRating, reviewCount } = await getAllPublishedReviews();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Schema.org requires visible content to back structured data — omitted
  // entirely while there are no published reviews yet, rather than shipping
  // a fabricated rating.
  const jsonLd =
    reviewCount > 0
      ? {
          "@context": "https://schema.org",
          "@type": "AggregateRating",
          itemReviewed: { "@type": "BeautySalon", name: "Visavis" },
          ratingValue: Number(averageRating.toFixed(1)),
          reviewCount,
        }
      : null;

  return (
    <Container className="flex flex-col gap-14 py-20">
      {jsonLd ? (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <SectionHeading
        eyebrow="Відгуки"
        title="Що кажуть наші клієнтки"
        description="Реальні враження про роботу майстрів Visavis за кожним напрямком."
      />

      {reviews.length ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {reviews.map((review) => (
            <figure
              key={review.id}
              className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-7"
            >
              <div className="flex items-center justify-between">
                <div className="flex text-accent">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                {review.masterName ? (
                  <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle">
                    {review.masterName}
                  </span>
                ) : null}
              </div>
              <blockquote className="text-fg-muted">“{review.text}”</blockquote>
              <figcaption className="text-sm text-fg">
                {review.authorName} <span className="text-fg-subtle">· {review.locationName}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="text-fg-muted">Поки що немає опублікованих відгуків.</p>
      )}
    </Container>
  );
}
