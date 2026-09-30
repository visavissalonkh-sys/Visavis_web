"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageLoadTransition } from "@/components/ui/PageLoadTransition";
import type { PublicLocation } from "@/lib/locations";

/**
 * The home page ships its own header, footer and intro overlay as part of the
 * approved design, so the shared site chrome steps aside there — including
 * `site-header-spacer`, whose top padding would push the full-bleed hero down
 * by the old header's height, and PageLoadTransition, which would fight the
 * design's own preloader for the same z-index.
 *
 * Every other route is untouched.
 */
export function SiteChrome({
  locations,
  children,
}: {
  locations: PublicLocation[];
  children: React.ReactNode;
}) {
  const isHome = usePathname() === "/";

  if (isHome) return <main className="flex-1">{children}</main>;

  return (
    <>
      <PageLoadTransition />
      <SiteHeader locations={locations} />
      <main className="site-header-spacer flex-1">{children}</main>
      <SiteFooter locations={locations} />
    </>
  );
}
