import { PrismaClient } from "@prisma/client";
import { services } from "../src/lib/data/services";
import { masters as masterSeed } from "../src/lib/data/masters";

const prisma = new PrismaClient();

// Seed-only fixtures — the live app reads Location rows straight from the DB
// (src/lib/locations.ts) once seeded, not from a static file. Addresses are
// still placeholders pending confirmed street addresses from the client.
const locationSeed = [
  { slug: "sumska", name: "Visavis на Сумській", address: "м. Харків, вул. Сумська (адреса уточнюється)", phone: "+38 (057) 000-00-01" },
  { slug: "pavlove-pole", name: "Visavis на Павловому Полі", address: "м. Харків, Павлове Поле (адреса уточнюється)", phone: "+38 (057) 000-00-02" },
];

// 0 = Sunday .. 6 = Saturday (matches JS Date#getDay and the schema comment).
// Every master gets Monday off; the salon itself is open every day 09:00-21:00.
const WORK_DAYS = [0, 2, 3, 4, 5, 6];
const SHIFT = { from: "10:00", to: "19:00" };

function splitAcrossLocations<T>(days: number[], locations: T[]): number[][] {
  if (locations.length <= 1) return locations.map(() => days);
  const mid = Math.ceil(days.length / locations.length);
  return locations.map((_, i) => days.slice(i * mid, i * mid + mid));
}

async function main() {
  const locationIdBySlug = new Map<string, string>();
  for (const loc of locationSeed) {
    const record = await prisma.location.upsert({
      where: { slug: loc.slug },
      update: {},
      create: {
        slug: loc.slug,
        name: loc.name,
        address: loc.address,
        phone: loc.phone,
        workingHours: { everyday: "09:00-21:00" },
        photoUrls: [],
      },
    });
    locationIdBySlug.set(loc.slug, record.id);
  }

  const serviceIdBySlug = new Map<string, string>();
  for (const svc of services) {
    const record = await prisma.service.upsert({
      where: { seoSlug: svc.slug },
      update: {},
      create: {
        category: svc.categorySlug,
        name: svc.name,
        description: svc.description,
        durationMinutes: svc.durationMinutes,
        priceFrom: svc.priceFrom,
        priceTo: svc.priceTo ?? null,
        photoUrls: [],
        seoSlug: svc.slug,
      },
    });
    serviceIdBySlug.set(svc.slug, record.id);
  }

  for (const [index, m] of masterSeed.entries()) {
    const phone = `+38050${String(index + 1).padStart(7, "0")}`;

    const user = await prisma.user.upsert({
      where: { phone },
      update: { name: m.name, role: "master" },
      create: { phone, name: m.name, role: "master" },
    });

    const master = await prisma.master.upsert({
      where: { slug: m.slug },
      update: { name: m.name, bio: m.bio, ratingCached: m.rating },
      create: {
        slug: m.slug,
        userId: user.id,
        name: m.name,
        bio: m.bio,
        ratingCached: m.rating,
      },
    });

    const relevantServices = services.filter((s) => m.specialtySlugs.includes(s.categorySlug));
    for (const svc of relevantServices) {
      const serviceId = serviceIdBySlug.get(svc.slug)!;
      await prisma.masterSpecialty.upsert({
        where: { masterId_serviceId: { masterId: master.id, serviceId } },
        update: {},
        create: { masterId: master.id, serviceId },
      });
    }

    const dayGroups = splitAcrossLocations(WORK_DAYS, m.locationSlugs);
    for (const [locIndex, locationSlug] of m.locationSlugs.entries()) {
      const locationId = locationIdBySlug.get(locationSlug)!;
      for (const weekday of dayGroups[locIndex]) {
        await prisma.masterLocation.upsert({
          where: { masterId_locationId_weekday: { masterId: master.id, locationId, weekday } },
          update: {},
          create: {
            masterId: master.id,
            locationId,
            weekday,
            timeFrom: SHIFT.from,
            timeTo: SHIFT.to,
          },
        });
      }
    }

    console.log(`Seeded master ${m.name} (${master.slug})`);
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
