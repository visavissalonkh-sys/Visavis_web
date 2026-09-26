import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublicLocations } from "@/lib/locations";
import { prisma } from "@/lib/prisma";

// Not SSG — see /masters/[slug]/page.tsx for why.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Філії",
  description: "Філії Visavis у Харкові: адреси, графік роботи та контактні телефони.",
  alternates: { canonical: "/locations", languages: { "uk-UA": "/locations" } },
};

export default async function LocationsPage() {
  const locations = await getPublicLocations();
  const masterLocations = await prisma.masterLocation.findMany({
    distinct: ["masterId", "locationId"],
    include: { master: true, location: true },
  });

  const teamBySlug = new Map<string, { slug: string; name: string }[]>();
  for (const ml of masterLocations) {
    const key = ml.location.slug;
    const list = teamBySlug.get(key) ?? [];
    if (!list.some((m) => m.slug === ml.master.slug)) {
      list.push({ slug: ml.master.slug, name: ml.master.name });
    }
    teamBySlug.set(key, list);
  }

  return (
    <Container className="flex flex-col gap-14 py-20">
      <SectionHeading
        title="Де нас знайти"
        description="Обидві філії працюють за єдиним стандартом сервісу та переліком послуг."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {locations.map((location) => {
          const team = teamBySlug.get(location.slug) ?? [];

          return (
            <div
              key={location.slug}
              className="flex flex-col gap-6 rounded-none border border-border bg-surface p-8"
            >
              <div
                aria-hidden
                className="relative flex h-40 items-center justify-center overflow-hidden rounded-none border border-border-strong"
                style={{ background: "radial-gradient(ellipse at 50% 50%, var(--color-surface-2), var(--color-surface))" }}
              >
                {[
                  "left-3 top-3",
                  "right-3 top-3",
                  "bottom-3 left-3",
                  "bottom-3 right-3",
                ].map((position) => (
                  <span
                    key={position}
                    className={`absolute h-1.5 w-1.5 rounded-full bg-accent ${position}`}
                    style={{ boxShadow: "0 0 8px 2px color-mix(in srgb, var(--color-accent) 70%, transparent)" }}
                  />
                ))}
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-lg text-accent">
                  ●
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="font-display text-2xl text-fg">{location.name}</h2>
                <p className="text-fg-muted">{location.address}</p>
                <p className="text-fg-muted">{location.hours}</p>
                <a
                  href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`}
                  className="w-fit text-accent hover:text-accent-hover"
                >
                  {location.phone}
                </a>
              </div>

              {team.length ? (
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
                    Майстри філії
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {team.map((master) => (
                      <span
                        key={master.slug}
                        className="rounded-full border border-border-strong px-3 py-1 text-xs text-fg-muted"
                      >
                        {master.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Container>
  );
}
