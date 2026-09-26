import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { categories } from "@/lib/data/services";
import { getPublicLocations } from "@/lib/locations";
import { Hero } from "@/components/sections/hero";
import { CategoriesStrip } from "@/components/sections/categories-strip";
import { FeaturedMasters } from "@/components/sections/featured-masters";
import { StatsAccent } from "@/components/sections/stats-accent";
import { LocationsStrip } from "@/components/sections/locations-strip";
import { Testimonials } from "@/components/sections/testimonials";
import { CtaBanner } from "@/components/sections/cta-banner";

// Not SSG — see /masters/[slug]/page.tsx for why.
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visavis.example";
const homeTitle = "Visavis — преміальний салон краси в Харкові";
const homeDescription =
  "Visavis — преміальна мережа салонів краси в Харкові на Сумській та Павловому Полі. Манікюр, стрижки, косметологія, перманентний макіяж і масаж. Онлайн-запис до кращих майстрів міста.";

// Root layout's own `metadata` covers every page as a fallback (title
// template, base OG type) — this overrides it with the homepage's actual
// title/description/OG/Twitter card instead of inheriting the generic ones,
// and is the one page allowed to skip the "%s · Visavis" title template
// (title.absolute) since "Visavis · Visavis" would be redundant.
export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  keywords: [
    "салон краси Харків",
    "манікюр Харків",
    "стрижка Харків",
    "косметолог Харків",
    "перманентний макіяж Харків",
    "Сумська салон краси",
    "Павлове Поле салон краси",
  ],
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "Visavis",
    url: siteUrl,
    title: homeTitle,
    description: homeDescription,
    images: [{ url: `${siteUrl}/og-cover.jpg`, width: 1200, height: 630, alt: "Visavis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: [`${siteUrl}/og-cover.jpg`],
  },
  alternates: {
    canonical: siteUrl,
    languages: { "uk-UA": siteUrl },
  },
};

const faqItems = [
  {
    question: "Як записатися на послугу у Visavis?",
    answer:
      "Онлайн — через сайт (розділ «Запис») або через нашого Telegram-бота: обираєте послугу, майстра, зручний час і підтверджуєте запис.",
  },
  {
    question: "Які послуги надає салон Visavis?",
    answer:
      "Стрижки та фарбування волосся, манікюр і педикюр, косметологія, перманентний макіяж і масаж — усе за одним записом у наших філіях.",
  },
  {
    question: "Чи можна скасувати або перенести запис?",
    answer:
      "Так, скасувати запис можна у особистому кабінеті або в боті не пізніше ніж за 2 години до візиту.",
  },
  {
    question: "У яких районах Харкова знаходяться салони Visavis?",
    answer: "Дві філії: на Сумській та на Павловому Полі.",
  },
  {
    question: "Який графік роботи салонів Visavis?",
    answer: "Обидві філії працюють щодня з 09:00 до 21:00.",
  },
];

export default async function Home() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const locations = await getPublicLocations();
  const activeMasterCount = await prisma.master.count({ where: { isActive: true } });

  const masters = await prisma.master.findMany({
    where: { isActive: true },
    include: {
      specialties: { include: { service: true } },
      _count: { select: { reviews: { where: { isPublished: true } } } },
    },
    orderBy: { ratingCached: "desc" },
    take: 4,
  });

  const featuredMasters = masters.map((master) => {
    const specialtySlugs = [...new Set(master.specialties.map((s) => s.service.category))];
    const specialtyNames = categories.filter((c) => specialtySlugs.includes(c.slug)).map((c) => c.name);
    return {
      slug: master.slug,
      name: master.name,
      bio: master.bio,
      avatarUrl: master.avatarUrl,
      rating: Number(master.ratingCached),
      reviewCount: master._count.reviews,
      specialtyNames,
    };
  });

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero />
      <CategoriesStrip />
      <div className="section-divider-to-cream" aria-hidden />
      <FeaturedMasters masters={featuredMasters} />
      <div className="section-divider-to-dark" aria-hidden />
      <StatsAccent masterCount={activeMasterCount} locationCount={locations.length} />
      <div className="section-divider-to-cream" aria-hidden />
      <Testimonials />
      <div className="section-divider-to-dark" aria-hidden />
      <LocationsStrip locations={locations} />
      <CtaBanner />
    </>
  );
}
