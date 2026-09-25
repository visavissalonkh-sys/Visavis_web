import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Playfair_Display } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { prisma } from "@/lib/prisma";
import { buildLocationJsonLd } from "@/lib/seo/local-business";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
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

  const activeLocations = await prisma.location.findMany({ where: { isActive: true } });
  const locationJsonLds = activeLocations.map((location) => buildLocationJsonLd(location, siteUrl));

  return (
    <html
      lang="uk"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
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
          <SiteHeader />
          <main className="flex-1 pt-20">{children}</main>
          <SiteFooter />
        </AuthModalProvider>
      </body>
    </html>
  );
}
