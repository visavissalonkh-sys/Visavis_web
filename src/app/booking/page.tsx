import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { categories } from "@/lib/data/services";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Онлайн-запис",
  description: "Онлайн-запис до салону Visavis: оберіть послугу, майстра та зручний час.",
  robots: { index: false, follow: false },
};

export default async function BookingPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [services, masters, locations, masterLocations, masterSpecialties, popularCounts, session] =
    await Promise.all([
      prisma.service.findMany({ where: { isActive: true } }),
      prisma.master.findMany({ where: { isActive: true } }),
      prisma.location.findMany({ where: { isActive: true } }),
      prisma.masterLocation.findMany(),
      prisma.masterSpecialty.findMany(),
      prisma.booking.groupBy({
        by: ["masterId"],
        where: { createdAt: { gte: since }, status: { in: ["pending", "confirmed", "completed"] } },
        _count: { masterId: true },
      }),
      getSession(),
    ]);

  const topPopular = popularCounts.reduce<{ masterId: string; count: number } | null>((top, row) => {
    const count = row._count.masterId;
    if (count > 0 && (!top || count > top.count)) return { masterId: row.masterId, count };
    return top;
  }, null);

  const currentUser = session
    ? await prisma.user.findUnique({ where: { id: session.sub }, select: { name: true, phone: true } })
    : null;

  return (
    <Suspense fallback={null}>
      <BookingWizard
        isAuthenticated={session !== null}
        currentUser={currentUser}
        data={{
          categories,
          services: services.map((s) => ({
            id: s.id,
            category: s.category,
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            priceFrom: Number(s.priceFrom),
            priceTo: s.priceTo ? Number(s.priceTo) : null,
            seoSlug: s.seoSlug,
          })),
          masters: masters.map((m) => ({
            id: m.id,
            slug: m.slug,
            name: m.name,
            bio: m.bio,
            rating: Number(m.ratingCached),
            isPopular: m.id === topPopular?.masterId,
          })),
          locations: locations.map((l) => ({
            id: l.id,
            slug: l.slug,
            name: l.name,
            address: l.address,
            phone: l.phone,
          })),
          masterLocations: masterLocations.map((ml) => ({
            masterId: ml.masterId,
            locationId: ml.locationId,
            weekday: ml.weekday,
          })),
          masterSpecialties: masterSpecialties.map((ms) => ({
            masterId: ms.masterId,
            serviceId: ms.serviceId,
          })),
        }}
      />
    </Suspense>
  );
}
