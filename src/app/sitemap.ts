import type { MetadataRoute } from "next";
import { categories } from "@/lib/data/services";
import { prisma } from "@/lib/prisma";

// Not statically cached at build time — see /masters/[slug]/page.tsx for why
// (this file also queries Prisma, which needs the DB reachable at build).
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visavis.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, masters, locations, latestReview] = await Promise.all([
    prisma.service.findMany({ where: { isActive: true }, select: { category: true, updatedAt: true } }),
    prisma.master.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.location.findMany({ where: { isActive: true }, select: { updatedAt: true } }),
    prisma.review.findFirst({ where: { isPublished: true }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const latestServiceUpdate = services.reduce<Date | null>(
    (latest, s) => (!latest || s.updatedAt > latest ? s.updatedAt : latest),
    null,
  );
  const latestLocationUpdate = locations.reduce<Date | null>(
    (latest, l) => (!latest || l.updatedAt > latest ? l.updatedAt : latest),
    null,
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: latestServiceUpdate ?? new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/services`, lastModified: latestServiceUpdate ?? new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/masters`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/locations`, lastModified: latestLocationUpdate ?? new Date(), changeFrequency: "monthly", priority: 0.6 },
    {
      url: `${siteUrl}/reviews`,
      lastModified: latestReview?.createdAt ?? new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    { url: `${siteUrl}/booking`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  const servicesByCategory = new Map<string, Date>();
  for (const service of services) {
    const current = servicesByCategory.get(service.category);
    if (!current || service.updatedAt > current) servicesByCategory.set(service.category, service.updatedAt);
  }

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/services/${category.slug}`,
    lastModified: servicesByCategory.get(category.slug) ?? new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const masterRoutes: MetadataRoute.Sitemap = masters.map((master) => ({
    url: `${siteUrl}/masters/${master.slug}`,
    lastModified: master.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...masterRoutes];
}
