import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visavis.example";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/master", "/account", "/api", "/booking/success"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
