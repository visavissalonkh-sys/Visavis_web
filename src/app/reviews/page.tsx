import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { reviews } from "@/lib/data/reviews";
import { categories } from "@/lib/data/services";

export const metadata: Metadata = {
  title: "Відгуки",
  description: "Відгуки клієнтів мережі салонів краси Visavis у Харкові.",
};

export default function ReviewsPage() {
  return (
    <Container className="flex flex-col gap-14 py-20">
      <SectionHeading
        eyebrow="Відгуки"
        title="Що кажуть наші клієнтки"
        description="Реальні враження про роботу майстрів Visavis за кожним напрямком."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {reviews.map((review) => {
          const category = categories.find((c) => c.slug === review.categorySlug);

          return (
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
                {category ? (
                  <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle">
                    {category.name}
                  </span>
                ) : null}
              </div>
              <blockquote className="text-fg-muted">“{review.text}”</blockquote>
              <figcaption className="text-sm text-fg">{review.authorName}</figcaption>
            </figure>
          );
        })}
      </div>
    </Container>
  );
}
