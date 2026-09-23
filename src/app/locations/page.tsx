import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { locations } from "@/lib/data/locations";
import { masters } from "@/lib/data/masters";

export const metadata: Metadata = {
  title: "Філії",
  description: "Філії Visavis у Харкові: адреси, графік роботи та контактні телефони.",
};

export default function LocationsPage() {
  return (
    <Container className="flex flex-col gap-14 py-20">
      <SectionHeading
        eyebrow="Філії"
        title="Де нас знайти"
        description="Обидві філії працюють за єдиним стандартом сервісу та переліком послуг."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {locations.map((location) => {
          const team = masters.filter((m) => m.locationSlugs.includes(location.slug));

          return (
            <div
              key={location.slug}
              className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-8"
            >
              <div
                aria-hidden
                className="flex h-40 items-center justify-center rounded-2xl border border-border-strong"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                  backgroundColor: "var(--color-surface-2)",
                }}
              >
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
