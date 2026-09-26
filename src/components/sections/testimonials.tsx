import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { reviews } from "@/lib/data/reviews";
import { categories } from "@/lib/data/services";

export function Testimonials() {
  return (
    <section className="border-t border-border py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Відгуки"
          title="Що кажуть клієнтки Visavis"
          align="center"
        />

        <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {reviews.map((review) => {
            const category = categories.find((c) => c.slug === review.categorySlug);

            return (
              <figure key={review.id} className="flex h-full min-w-[280px] snap-start flex-col gap-3 sm:min-w-0">
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
                  {category ? (
                    <span className="text-xs text-fg-subtle">{category.name}</span>
                  ) : null}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
