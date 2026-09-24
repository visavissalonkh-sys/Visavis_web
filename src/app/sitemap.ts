import type { MetadataRoute } from "next";
import { categories } from "@/lib/data/services";
import { prisma } from "@/lib/prisma";

// Not statically cached at build time — see /masters/[slug]/page.tsx for why
// (this file also queries Prisma, which needs the DB reachable at build).
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visavis.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/services", "/masters", "/locations", "/reviews", "/booking"].map(
    (route) => ({
      url: `${siteUrl}${route}`,
      lastModified: new Date(),
    }),
  );

  const categoryRoutes = categories.map((category) => ({
    url: `${siteUrl}/services/${category.slug}`,
    lastModified: new Date(),
  }));

  const masters = await prisma.master.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
  const masterRoutes = masters.map((master) => ({
    url: `${siteUrl}/masters/${master.slug}`,
    lastModified: master.updatedAt,
  }));

  return [...staticRoutes, ...categoryRoutes, ...masterRoutes];
}
