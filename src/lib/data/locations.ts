// Placeholder branch content — replace with confirmed addresses, phones and hours.

export type Location = {
  slug: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  mapQuery: string;
};

export const locations: Location[] = [
  {
    slug: "sumska",
    name: "Visavis на Сумській",
    address: "м. Харків, вул. Сумська (адреса уточнюється)",
    phone: "+38 (057) 000-00-01",
    hours: "Щодня, 09:00–21:00",
    mapQuery: "Сумська вулиця, Харків",
  },
  {
    slug: "pavlove-pole",
    name: "Visavis на Павловому Полі",
    address: "м. Харків, Павлове Поле (адреса уточнюється)",
    phone: "+38 (057) 000-00-02",
    hours: "Щодня, 09:00–21:00",
    mapQuery: "Павлове Поле, Харків",
  },
];

export function getLocation(slug: string) {
  return locations.find((location) => location.slug === slug);
}
