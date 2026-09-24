// Placeholder team content, used only as the seed source (prisma/seed.ts) for
// the DB rows the app actually reads at runtime — public pages and the master
// dashboard read from Postgres, not this file. Replace with real bios/photos
// once provided by the client, then re-run `npm run db:seed`.

export type Master = {
  slug: string;
  name: string;
  role: string;
  specialtySlugs: string[];
  locationSlugs: string[];
  bio: string;
  rating: number;
  reviewsCount: number;
};

export const masters: Master[] = [
  {
    slug: "olena-hair",
    name: "Олена Ковальчук",
    role: "Топ-стиліст із волосся",
    specialtySlugs: ["hair"],
    locationSlugs: ["sumska"],
    bio: "10+ років у преміум-колористиці. Спеціалізація — складні техніки фарбування та відновлення волосся.",
    rating: 4.9,
    reviewsCount: 128,
  },
  {
    slug: "mariia-nails",
    name: "Марія Литвин",
    role: "Майстер манікюру",
    specialtySlugs: ["nails"],
    locationSlugs: ["sumska", "pavlove-pole"],
    bio: "Ювелірна точність та авторський дизайн. Учасниця відкритих чемпіонатів з нейл-арту.",
    rating: 5.0,
    reviewsCount: 96,
  },
  {
    slug: "kateryna-cosmetology",
    name: "Катерина Бондар",
    role: "Косметолог-естетист",
    specialtySlugs: ["cosmetology"],
    locationSlugs: ["pavlove-pole"],
    bio: "Медична освіта, апаратна та ін'єкційна косметологія. Індивідуальні протоколи догляду.",
    rating: 4.8,
    reviewsCount: 74,
  },
  {
    slug: "anna-pmu",
    name: "Анна Сидоренко",
    role: "Майстер перманентного макіяжу",
    specialtySlugs: ["permanent"],
    locationSlugs: ["sumska"],
    bio: "Природний перманентний макіяж брів і губ з фокусом на симетрію та довговічність пігменту.",
    rating: 4.9,
    reviewsCount: 61,
  },
  {
    slug: "ihor-massage",
    name: "Ігор Мельник",
    role: "Масажист-реабілітолог",
    specialtySlugs: ["massage"],
    locationSlugs: ["pavlove-pole"],
    bio: "Спортивна медицина та класичний масаж. Індивідуальний підбір техніки під запит клієнта.",
    rating: 4.9,
    reviewsCount: 53,
  },
];

export function getMaster(slug: string) {
  return masters.find((master) => master.slug === slug);
}

export function getMastersByCategory(categorySlug: string) {
  return masters.filter((master) => master.specialtySlugs.includes(categorySlug));
}
