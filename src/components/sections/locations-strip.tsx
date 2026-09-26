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
              className="group flex h-full flex-col justify-between gap-8 overflow-hidden rounded-none border border-border bg-surface p-8"
            >
              <div
                aria-hidden
                className="relative flex h-32 items-center justify-center overflow-hidden rounded-none border border-border-strong"
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
