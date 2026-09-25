import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { prisma } from "@/lib/prisma";
import { categories } from "@/lib/data/services";

// Not SSG — see /masters/[slug]/page.tsx for why (build-time DB dependency
// broke the Railway build).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Майстри",
  description: "Команда майстрів Visavis: стилісти, майстри манікюру, косметологи, PMU-майстри та масажисти.",
  alternates: { canonical: "/masters", languages: { "uk-UA": "/masters" } },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default async function MastersPage() {
  const masters = await prisma.master.findMany({
    where: { isActive: true },
    include: {
      specialties: { include: { service: true } },
      masterLocations: { include: { location: true }, distinct: ["locationId"] },
      _count: { select: { reviews: { where: { isPublished: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <Container className="flex flex-col gap-14 py-20">
      <SectionHeading
        eyebrow="Команда"
        title="Майстри Visavis"
        description="Кожен майстер — окрема спеціалізація, постійна практика та підтвердження кваліфікації."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {masters.map((master, index) => {
          const primaryCategorySlug = master.specialties[0]?.service.category;
          const primaryCategory = categories.find((c) => c.slug === primaryCategorySlug)?.name;
          const masterLocations = master.masterLocations.map((ml) => ml.location);

          return (
            <Link
              key={master.slug}
              href={`/masters/${master.slug}`}
              className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-7 transition-colors hover:border-accent-border hover:bg-surface-2"
            >
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-accent-border bg-accent-soft">
                {master.avatarUrl ? (
                  <Image
                    src={master.avatarUrl}
                    alt={master.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    priority={index < 3}
                  />
                ) : (
                  <span className="font-display text-lg text-accent">{initials(master.name)}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl text-fg">{master.name}</h2>
                {master.bio ? <p className="line-clamp-2 text-sm text-fg-muted">{master.bio}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {primaryCategory ? (
                  <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle">
                    {primaryCategory}
                  </span>
                ) : null}
                {masterLocations.map((location) => (
                  <span
                    key={location.id}
                    className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle"
                  >
                    {location.name.replace("Visavis на ", "")}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-fg">★ {Number(master.ratingCached).toFixed(1)}</span>
                <span className="text-fg-subtle">{master._count.reviews} відгуків</span>
              </div>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
