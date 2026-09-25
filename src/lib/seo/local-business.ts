type DayHours = { isOpen: boolean; from?: string; to?: string };
type PerDayWorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>;
type LegacyWorkingHours = { everyday: string };

const DAY_TO_SCHEMA: Record<keyof PerDayWorkingHours, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function isLegacyShape(wh: unknown): wh is LegacyWorkingHours {
  return !!wh && typeof wh === "object" && "everyday" in (wh as Record<string, unknown>);
}

function isPerDayShape(wh: unknown): wh is PerDayWorkingHours {
  return !!wh && typeof wh === "object" && "mon" in (wh as Record<string, unknown>);
}

// `Location.workingHours` predates the per-day admin editor — existing rows
// still carry the legacy `{ everyday: "09:00-21:00" }` shape until an admin
// re-saves them through AdminLocationForm, which writes the newer per-day shape.
function buildOpeningHoursSpecification(workingHours: unknown) {
  if (isLegacyShape(workingHours)) {
    const match = workingHours.everyday.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
    if (!match) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: Object.values(DAY_TO_SCHEMA),
        opens: match[1],
        closes: match[2],
      },
    ];
  }

  if (isPerDayShape(workingHours)) {
    return Object.entries(workingHours)
      .filter((entry): entry is [keyof PerDayWorkingHours, DayHours] => entry[1].isOpen && !!entry[1].from && !!entry[1].to)
      .map(([day, hours]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_TO_SCHEMA[day],
        opens: hours.from,
        closes: hours.to,
      }));
  }

  return [];
}

export function buildLocationJsonLd(
  location: {
    name: string;
    address: string;
    phone: string;
    workingHours: unknown;
    latitude: number | null;
    longitude: number | null;
  },
  siteUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: location.name,
    url: siteUrl,
    image: `${siteUrl}/og-cover.jpg`,
    telephone: location.phone,
    priceRange: "$$",
    sameAs: ["https://www.instagram.com/salon_vis_a_vis"],
    address: {
      "@type": "PostalAddress",
      streetAddress: location.address,
      addressLocality: "Харків",
      addressCountry: "UA",
    },
    // Omitted while coordinates aren't set — see the Location model comment
    // in prisma/schema.prisma on why they're still null.
    ...(location.latitude != null && location.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: location.latitude,
            longitude: location.longitude,
          },
        }
      : {}),
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`,
    openingHoursSpecification: buildOpeningHoursSpecification(location.workingHours),
  };
}
