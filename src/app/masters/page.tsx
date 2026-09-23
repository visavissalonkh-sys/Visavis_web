import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { masters } from "@/lib/data/masters";
import { categories } from "@/lib/data/services";
import { locations } from "@/lib/data/locations";

export const metadata: Metadata = {
  title: "Майстри",
  description: "Команда майстрів Visavis: стилісти, майстри манікюру, косметологи, PMU-майстри та масажисти.",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function MastersPage() {
  return (
    <Container className="flex flex-col gap-14 py-20">
      <SectionHeading
        eyebrow="Команда"
        title="Майстри Visavis"
        description="Кожен майстер — окрема спеціалізація, постійна практика та підтвердження кваліфікації."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {masters.map((master) => {
          const specialty = categories.find((c) => c.slug === master.specialtySlugs[0]);
          const masterLocations = locations.filter((l) =>
            master.locationSlugs.includes(l.slug),
          );

          return (
            <Link
              key={master.slug}
              href={`/masters/${master.slug}`}
              className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-7 transition-colors hover:border-accent-border hover:bg-surface-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent-border bg-accent-soft font-display text-lg text-accent">
                {initials(master.name)}
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl text-fg">{master.name}</h2>
                <p className="text-sm text-fg-muted">{master.role}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {specialty ? (
                  <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle">
                    {specialty.name}
                  </span>
                ) : null}
                {masterLocations.map((location) => (
                  <span
                    key={location.slug}
                    className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-subtle"
                  >
                    {location.name.replace("Visavis на ", "")}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-fg">★ {master.rating.toFixed(1)}</span>
                <span className="text-fg-subtle">{master.reviewsCount} відгуків</span>
              </div>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
