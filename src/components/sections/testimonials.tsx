import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
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
          {reviews.map((review, index) => {
            const category = categories.find((c) => c.slug === review.categorySlug);

            return (
              <Reveal
                key={review.id}
                delay={index * 60}
                className="min-w-[280px] snap-start sm:min-w-0"
              >
                <figure className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-border bg-surface p-7">
                  <div className="flex text-accent">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-fg-muted">
                    “{review.text}”
                  </blockquote>
                  <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-xs font-medium text-accent">
                      {review.authorInitials}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm text-fg">{review.authorName}</span>
                      {category ? (
                        <span className="text-xs text-fg-subtle">{category.name}</span>
                      ) : null}
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
