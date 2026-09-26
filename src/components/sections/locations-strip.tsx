import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { PublicLocation } from "@/lib/locations";

export function LocationsStrip({ locations }: { locations: PublicLocation[] }) {
  return (
    <section className="border-t border-border py-24 sm:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          title="Дві локації в Харкові"
          description="Оберіть зручну для вас точку — стандарт сервісу й асортимент послуг однакові в обох."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {locations.map((location) => (
            <div
              key={location.slug}
              className="group flex h-full flex-col justify-between gap-8 overflow-hidden rounded-2xl border border-border bg-surface p-8"
            >
              <div
                aria-hidden
                className="relative flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-border-strong"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  backgroundColor: "var(--color-surface-2)",
                }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent">
                  ●
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-display text-2xl text-fg">{location.name}</h3>
                <p className="text-sm text-fg-muted">{location.address}</p>
                <p className="text-sm text-fg-muted">{location.hours}</p>
              </div>

              <a
                href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`}
                className="w-fit text-sm font-medium text-accent transition-colors hover:text-accent-hover"
              >
                {location.phone}
              </a>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
