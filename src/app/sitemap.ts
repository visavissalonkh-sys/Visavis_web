import type { MetadataRoute } from "next";
import { categories } from "@/lib/data/services";
import { masters } from "@/lib/data/masters";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visavis.example";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const masterRoutes = masters.map((master) => ({
    url: `${siteUrl}/masters/${master.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...categoryRoutes, ...masterRoutes];
}
