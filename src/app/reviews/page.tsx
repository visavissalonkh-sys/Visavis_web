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
        title="Що кажуть наші клієнтки"
        description="Реальні враження про роботу майстрів Visavis за кожним напрямком."
      />

      {reviews.length ? (
        <div className="grid gap-10 sm:grid-cols-2">
          {reviews.map((review) => (
            <figure key={review.id} className="flex flex-col gap-3">
              <span aria-hidden className="font-display text-6xl leading-none text-accent/40">
                “
              </span>
              <blockquote className="flex-1 text-base leading-relaxed text-fg-muted">
                {review.text}
              </blockquote>
              <figcaption className="flex flex-col gap-1 border-t border-border pt-4">
                <span className="flex items-center gap-2 text-sm text-fg">
                  {review.authorName}
                  <span className="text-xs text-accent">{"★".repeat(review.rating)}</span>
                </span>
                {review.masterName ? (
                  <span className="text-xs text-fg-subtle">{review.masterName}</span>
                ) : null}
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
