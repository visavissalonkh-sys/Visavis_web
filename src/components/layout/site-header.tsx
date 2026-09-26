"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { HeaderAuthAction } from "@/components/auth/HeaderAuthAction";
import type { PublicLocation } from "@/lib/locations";

const links = [
  { href: "/services", label: "Послуги" },
  { href: "/masters", label: "Майстри" },
  { href: "/locations", label: "Філії" },
  { href: "/reviews", label: "Відгуки" },
];

export function SiteHeader({ locations }: { locations: PublicLocation[] }) {
  const pathname = usePathname();
  // The visitor is already mid-booking here — a second "Записатися" in the
  // header is a distraction, not a conversion aid. Everywhere else (incl.
  // /account, /master, /admin) keeps the button; only its visual style
  // changes site-wide with the vis-à-vis redesign, not this behavior.
  const hideCta = pathname?.startsWith("/booking") ?? false;

  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-bg/95 backdrop-blur-md lg:bg-bg/80">
      <Container className="flex h-full items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-[0.14em] text-fg lg:text-2xl">
          VISAVIS
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <HeaderAuthAction />
          {hideCta ? null : <Button href="/booking">Записатися</Button>}
        </div>

        <MobileNav locations={locations} hideCta={hideCta} />
      </Container>
    </header>
  );
}
