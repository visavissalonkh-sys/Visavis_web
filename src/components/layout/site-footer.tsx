import Link from "next/link";
import { Container } from "@/components/ui/container";
import type { PublicLocation } from "@/lib/locations";

export function SiteFooter({ locations }: { locations: PublicLocation[] }) {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col items-center gap-6 py-24 text-center">
        <span
          className="font-display text-fg"
          style={{ fontWeight: 300, fontSize: "clamp(3rem, 9vw, 7rem)", letterSpacing: "0.08em" }}
        >
          VISAVIS
        </span>
        <p className="max-w-md text-sm leading-relaxed text-fg-muted">
          Мережа преміальних салонів краси у Харкові. Волосся, нігті, косметологія,
          перманентний макіяж і масаж — в одному просторі.
        </p>
      </Container>

      <Container className="grid gap-12 pb-20 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <span className="text-sm font-medium text-fg-subtle">Меню</span>
          <Link href="/services" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Послуги
          </Link>
          <Link href="/masters" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Майстри
          </Link>
          <Link href="/reviews" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Відгуки
          </Link>
          <Link href="/booking" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Онлайн-запис
          </Link>
        </div>

        <div className="flex flex-col items-center gap-3">
          <span className="text-sm font-medium text-fg-subtle">Філії</span>
          {locations.map((location) => (
            <div key={location.slug} className="text-sm text-fg-muted">
              <div className="text-fg">{location.name}</div>
              <a href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`} className="hover:text-fg">
                {location.phone}
              </a>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 sm:items-end">
          <span className="text-sm font-medium text-fg-subtle">Соціальні мережі</span>
          <a
            href="https://www.instagram.com/salon_vis_a_vis"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent transition-colors hover:text-accent-hover"
          >
            @salon_vis_a_vis
          </a>
        </div>
      </Container>

      <div className="border-t border-border py-8">
        <Container className="flex flex-col gap-2 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Visavis. Усі права захищені.</span>
          <span>Харків</span>
        </Container>
      </div>
    </footer>
  );
}
