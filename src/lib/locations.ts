import { prisma } from "@/lib/prisma";

type DayHours = { isOpen: boolean; from?: string; to?: string };
type PerDayWorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>;
type LegacyWorkingHours = { everyday: string };

const DAY_ORDER: (keyof PerDayWorkingHours)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<keyof PerDayWorkingHours, string> = {
  mon: "Пн",
  tue: "Вт",
  wed: "Ср",
  thu: "Чт",
  fri: "Пт",
  sat: "Сб",
  sun: "Нд",
};

function isLegacyShape(wh: unknown): wh is LegacyWorkingHours {
  return !!wh && typeof wh === "object" && "everyday" in (wh as Record<string, unknown>);
}

function isPerDayShape(wh: unknown): wh is PerDayWorkingHours {
  return !!wh && typeof wh === "object" && "mon" in (wh as Record<string, unknown>);
}

// Mirrors the shape handling in src/lib/seo/local-business.ts, but formats
// for human display in Ukrainian instead of schema.org's OpeningHoursSpecification.
export function formatWorkingHoursUk(workingHours: unknown): string {
  if (isLegacyShape(workingHours)) {
    const match = workingHours.everyday.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
    return match ? `Щодня, ${match[1]}–${match[2]}` : workingHours.everyday;
  }

  if (isPerDayShape(workingHours)) {
    const signature = (d: DayHours) => (d.isOpen && d.from && d.to ? `${d.from}-${d.to}` : "closed");

    const groups: { fromDay: string; toDay: string; text: string }[] = [];
    let i = 0;
    while (i < DAY_ORDER.length) {
      const sig = signature(workingHours[DAY_ORDER[i]]);
      let j = i;
      while (j + 1 < DAY_ORDER.length && signature(workingHours[DAY_ORDER[j + 1]]) === sig) j++;
      const day = workingHours[DAY_ORDER[i]];
      groups.push({
        fromDay: DAY_LABELS[DAY_ORDER[i]],
        toDay: DAY_LABELS[DAY_ORDER[j]],
        text: day.isOpen && day.from && day.to ? `${day.from}–${day.to}` : "вихідний",
      });
      i = j + 1;
    }

    if (groups.length === 1 && groups[0].fromDay === DAY_LABELS.mon && groups[0].toDay === DAY_LABELS.sun) {
      return `Щодня, ${groups[0].text}`;
    }

    return groups
      .map((g) => `${g.fromDay === g.toDay ? g.fromDay : `${g.fromDay}–${g.toDay}`}: ${g.text}`)
      .join(", ");
  }

  return "Графік уточнюється";
}

export type PublicLocation = {
  slug: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
};

export function toPublicLocation(location: {
  slug: string;
  name: string;
  address: string;
  phone: string;
  workingHours: unknown;
}): PublicLocation {
  return {
    slug: location.slug,
    name: location.name,
    address: location.address,
    phone: location.phone,
    hours: formatWorkingHoursUk(location.workingHours),
  };
}

export async function getPublicLocations(): Promise<PublicLocation[]> {
  const locations = await prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return locations.map(toPublicLocation);
}
