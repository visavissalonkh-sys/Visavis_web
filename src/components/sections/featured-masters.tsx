import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export type FeaturedMaster = {
  slug: string;
  name: string;
  avatarUrl: string | null;
  rating: number;
  reviewCount: number;
  primaryCategoryName: string | null;
};

export function FeaturedMasters({ masters }: { masters: FeaturedMaster[] }) {
  if (masters.length === 0) return null;

  return (
    <section className="border-t border-border py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            title="Майстри, яким довіряють"
            description="Кожен майстер спеціалізується на своєму напрямку та проходить постійне підвищення кваліфікації."
          />
          <Button href="/masters" variant="outline">
            Уся команда
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {masters.map((master) => (
            <Link
              key={master.slug}
              href={`/masters/${master.slug}`}
              className="group flex h-full flex-col gap-6 rounded-2xl border border-border bg-surface p-7 transition-colors duration-300 hover:border-accent-border hover:bg-surface-2"
            >
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft">
                {master.avatarUrl ? (
                  <Image src={master.avatarUrl} alt={master.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="font-display text-lg text-accent">{initials(master.name)}</span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <h3 className="font-display text-xl text-fg">{master.name}</h3>
                {master.primaryCategoryName ? (
                  <span className="mt-1 w-fit rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle">
                    {master.primaryCategoryName}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-fg">★ {master.rating.toFixed(1)}</span>
                <span className="text-fg-subtle">{master.reviewCount} відгуків</span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
