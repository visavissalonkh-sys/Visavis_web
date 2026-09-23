import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { locations } from "@/lib/data/locations";

export const metadata: Metadata = {
  title: "Онлайн-запис",
  description: "Онлайн-запис до салону Visavis з'явиться найближчим часом.",
};

export default function BookingPage() {
  return (
    <Container className="flex flex-col items-center gap-10 py-28 text-center">
      <SectionHeading
        eyebrow="Онлайн-запис"
        title="Візард запису вже готується"
        description="Ми доробляємо зручний онлайн-запис із вибором послуги, майстра та часу. А поки — забронюйте візит телефоном."
        align="center"
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        {locations.map((location) => (
          <a
            key={location.slug}
            href={`tel:${location.phone.replace(/\s|\(|\)|-/g, "")}`}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-surface px-8 py-5 text-sm transition-colors hover:border-accent-border"
          >
            <span className="text-fg">{location.name}</span>
            <span className="text-accent">{location.phone}</span>
          </a>
        ))}
      </div>
    </Container>
  );
}
