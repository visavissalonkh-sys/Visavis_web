import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
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

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  name: "Visavis",
  url: siteUrl,
  image: `${siteUrl}/og-cover.jpg`,
  sameAs: ["https://www.instagram.com/salon_vis_a_vis"],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Харків",
    addressCountry: "UA",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <AuthModalProvider>
          <SiteHeader />
          <main className="flex-1 pt-20">{children}</main>
          <SiteFooter />
        </AuthModalProvider>
      </body>
    </html>
  );
}
