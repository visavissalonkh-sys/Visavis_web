import Link from "next/link";
import { Container } from "@/components/ui/container";
import type { PublicLocation } from "@/lib/locations";

export function SiteFooter({ locations }: { locations: PublicLocation[] }) {
  return (
    <>
      {/* Cream contact strip — a deliberate light beat right before the
          dark footer, matching the rest of the site's alternation. */}
      <div className="bg-cream py-12 text-center sm:py-[120px]">
        <Container className="flex flex-col items-center gap-6">
          <p className="text-sm text-on-cream-muted">Записуйтесь онлайн або телефонуйте</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-8">
            {locations.map((location) => (
              <a
                key={location.slug}
                href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`}
                className="font-display text-2xl text-on-cream transition-colors hover:text-accent-on-cream"
              >
                {location.phone}
              </a>
            ))}
          </div>
        </Container>
      </div>

      <footer className="border-t border-border bg-surface">
        <div className="h-px bg-accent" />
        <Container className="flex flex-col items-center gap-6 py-24 text-center">
          <span
            className="font-display text-fg"
            style={{ fontWeight: 300, fontSize: "clamp(3rem, 8vw, 9rem)", letterSpacing: "0.08em" }}
          >
            VISAVIS
          </span>
          <p className="max-w-md text-sm leading-relaxed text-fg-muted">
            Мережа преміальних салонів краси у Харкові. Волосся, нігті, косметологія,
            перманентний макіяж і масаж — в одному просторі.
          </p>
        </Container>

        <Container className="grid gap-12 pb-20 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="mb-2 text-sm font-medium text-fg-subtle">Меню</span>
            {[
              { href: "/services", label: "Послуги" },
              { href: "/masters", label: "Майстри" },
              { href: "/reviews", label: "Відгуки" },
              { href: "/booking", label: "Онлайн-запис" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center text-sm text-fg-muted transition-colors hover:text-fg"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="mb-2 text-sm font-medium text-fg-subtle">Філії</span>
            {locations.map((location) => (
              <div key={location.slug} className="flex min-h-11 flex-col items-center justify-center text-sm text-fg-muted">
                <div className="text-fg">{location.name}</div>
                <a href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`} className="hover:text-fg">
                  {location.phone}
                </a>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 sm:items-end">
            <span className="mb-1 text-sm font-medium text-fg-subtle">Соціальні мережі</span>
            <a
              href="https://www.instagram.com/salon_vis_a_vis"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram Visavis"
              className="flex h-11 w-11 items-center justify-center text-accent transition-colors hover:text-accent-hover"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
              </svg>
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
    </>
  );
}
