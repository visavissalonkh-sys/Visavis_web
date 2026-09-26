import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
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
          {locations.map((location) => {
            const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
            return (
              <div
                key={location.slug}
                className="group flex h-full flex-col justify-between gap-8 overflow-hidden rounded-none bg-cream p-8 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent-on-cream),0_12px_32px_-8px_color-mix(in_srgb,var(--color-accent-on-cream)_35%,transparent)]"
              >
                <div
                  aria-hidden
                  className="relative flex h-32 items-center justify-center overflow-hidden rounded-none border border-on-cream/15"
                  style={{ background: "radial-gradient(ellipse at 50% 50%, var(--color-cream-dark), var(--color-cream))" }}
                >
                  {["left-3 top-3", "right-3 top-3", "bottom-3 left-3", "bottom-3 right-3"].map((position) => (
                    <span
                      key={position}
                      className={`absolute h-1.5 w-1.5 rounded-full bg-accent-on-cream ${position}`}
                      style={{ boxShadow: "0 0 8px 2px color-mix(in srgb, var(--color-accent-on-cream) 70%, transparent)" }}
                    />
                  ))}
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-on-cream/40 bg-accent-on-cream/10 text-accent-on-cream">
                    ●
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="font-display text-2xl text-on-cream">{location.name}</h3>
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit text-sm text-accent-on-cream underline-offset-2 hover:underline"
                  >
                    {location.address}
                  </a>
                  <p className="text-sm text-on-cream-muted">{location.hours}</p>
                </div>

                <div className="flex flex-col gap-3">
                  <a
                    href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`}
                    className="w-fit text-sm font-medium text-accent-on-cream transition-colors hover:opacity-75"
                  >
                    {location.phone}
                  </a>
                  <Button
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    variant="outline"
                    className="h-11 w-full border-on-cream text-on-cream hover:border-accent-on-cream hover:text-accent-on-cream"
                  >
                    Як дістатись
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
