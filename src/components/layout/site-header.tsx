import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";

const links = [
  { href: "/services", label: "Послуги" },
  { href: "/masters", label: "Майстри" },
  { href: "/locations", label: "Філії" },
  { href: "/reviews", label: "Відгуки" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-[0.14em] text-fg">
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

        <div className="hidden lg:block">
          <Button href="/booking">Записатися</Button>
        </div>

        <MobileNav />
      </Container>
    </header>
  );
}
