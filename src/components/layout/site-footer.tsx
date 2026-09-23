import Link from "next/link";
import { Container } from "@/components/ui/container";
import { categories } from "@/lib/data/services";
import { locations } from "@/lib/data/locations";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <span className="font-display text-2xl tracking-[0.14em] text-fg">VISAVIS</span>
          <p className="max-w-xs text-sm leading-relaxed text-fg-muted">
            Мережа преміальних салонів краси у Харкові. Волосся, нігті, косметологія,
            перманентний макіяж і масаж — в одному просторі.
          </p>
          <a
            href="https://www.instagram.com/salon_vis_a_vis"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent transition-colors hover:text-accent-hover"
          >
            @salon_vis_a_vis
          </a>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
            Категорії
          </span>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/services/${category.slug}`}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
            Меню
          </span>
          <Link href="/masters" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Майстри
          </Link>
          <Link href="/locations" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Філії
          </Link>
          <Link href="/reviews" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Відгуки
          </Link>
          <Link href="/booking" className="text-sm text-fg-muted transition-colors hover:text-fg">
            Онлайн-запис
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
            Філії
          </span>
          {locations.map((location) => (
            <div key={location.slug} className="text-sm text-fg-muted">
              <div className="text-fg">{location.name}</div>
              <a href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`} className="hover:text-fg">
                {location.phone}
              </a>
            </div>
          ))}
        </div>
      </Container>

      <div className="border-t border-border py-6">
        <Container className="flex flex-col gap-2 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Visavis. Усі права захищені.</span>
          <span>Харків</span>
        </Container>
      </div>
    </footer>
  );
}
