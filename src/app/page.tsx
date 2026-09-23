import { Hero } from "@/components/sections/hero";
import { CategoriesStrip } from "@/components/sections/categories-strip";
import { FeaturedMasters } from "@/components/sections/featured-masters";
import { LocationsStrip } from "@/components/sections/locations-strip";
import { Testimonials } from "@/components/sections/testimonials";
import { CtaBanner } from "@/components/sections/cta-banner";

export default function Home() {
  return (
    <>
      <Hero />
      <CategoriesStrip />
      <FeaturedMasters />
      <LocationsStrip />
      <Testimonials />
      <CtaBanner />
    </>
  );
}
