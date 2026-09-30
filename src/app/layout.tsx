import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Inter,
  Cormorant_Garamond,
  Noto_Serif_Display,
  JetBrains_Mono,
  Great_Vibes,
} from "next/font/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safe-query";
import { buildLocationJsonLd } from "@/lib/seo/local-business";
import { toPublicLocation } from "@/lib/locations";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Italic 300 is the home page's quote/surname face; the upright weights are
// the rest of the site's display font. Not preloaded: nothing above the fold
// on any route uses it, so preloading it only competes with the hero faces.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

// The four faces the approved home design uses. Self-hosted by next/font —
// the mockup's fonts.googleapis.com <link> would be blocked by our CSP and
// would cost a third-party connection on LCP.
// Weight 100 is load-bearing, not decorative: the outline section numerals
// and the footer wordmark are set in it. Italic is never used — the design's
// only italic passages are Cormorant.
const notoSerifDisplay = Noto_Serif_Display({
  variable: "--font-noto-serif-display",
  subsets: ["latin", "cyrillic"],
  weight: ["100", "200", "300"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visavis.example";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Visavis — мережа преміальних салонів краси в Харкові",
    template: "%s · Visavis",
  },
  description:
    "Visavis — преміальна мережа салонів краси в Харкові: волосся, нігті, косметологія, перманентний макіяж, масаж. Онлайн-запис до кращих майстрів міста.",
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "Visavis",
    title: "Visavis — мережа преміальних салонів краси в Харкові",
    description:
      "Волосся, нігті, косметологія, перманентний макіяж і масаж — преміальний рівень сервісу у зручних локаціях Харкова.",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Falls back to an empty list rather than a hardcoded branch list: stale
  // phone numbers rendered as fact are worse than a footer that simply omits
  // the block until the database is back.
  const activeLocations = await safeQuery(
    "layout:locations",
    () => prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    [],
  );
  const locationJsonLds = activeLocations.map((location) => buildLocationJsonLd(location, siteUrl));
  const footerLocations = activeLocations.map(toPublicLocation);

  return (
    <html
      lang="uk"
      className={`${inter.variable} ${cormorant.variable} ${notoSerifDisplay.variable} ${jetbrainsMono.variable} ${greatVibes.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        {locationJsonLds.map((jsonLd, index) => (
          <script
            key={index}
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ))}
        <AuthModalProvider>
          <SiteChrome locations={footerLocations}>{children}</SiteChrome>
        </AuthModalProvider>
      </body>
    </html>
  );
}
