import { prisma } from "@/lib/prisma";
import { categories } from "@/lib/data/services";
import { Hero } from "@/components/sections/hero";
import { CategoriesStrip } from "@/components/sections/categories-strip";
import { FeaturedMasters } from "@/components/sections/featured-masters";
import { LocationsStrip } from "@/components/sections/locations-strip";
import { Testimonials } from "@/components/sections/testimonials";
import { CtaBanner } from "@/components/sections/cta-banner";

// Not SSG — see /masters/[slug]/page.tsx for why.
export const dynamic = "force-dynamic";

export default async function Home() {
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
    const primaryCategorySlug = master.specialties[0]?.service.category;
    return {
      slug: master.slug,
      name: master.name,
      avatarUrl: master.avatarUrl,
      rating: Number(master.ratingCached),
      reviewCount: master._count.reviews,
      primaryCategoryName: categories.find((c) => c.slug === primaryCategorySlug)?.name ?? null,
    };
  });

  return (
    <>
      <Hero />
      <CategoriesStrip />
      <FeaturedMasters masters={featuredMasters} />
      <LocationsStrip />
      <Testimonials />
      <CtaBanner />
    </>
  );
}
