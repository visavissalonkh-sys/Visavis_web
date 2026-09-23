// Placeholder catalog content — replace with real copy once client materials are ready.
// Categories mirror the salon's Instagram story highlights (@salon_vis_a_vis).

export type ServiceCategory = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
};

export type Service = {
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceFrom: number;
  priceTo?: number;
};

export const categories: ServiceCategory[] = [
  {
    slug: "hair",
    name: "Волосся",
    tagline: "Стрижки, фарбування, догляд",
    description:
      "Індивідуальний підбір форми та кольору, відновлювальні процедури й укладки для будь-якої довжини волосся.",
  },
  {
    slug: "nails",
    name: "Нігті",
    tagline: "Манікюр, педикюр, дизайн",
    description:
      "Апаратний і комбінований манікюр, покриття гель-лаком, авторський дизайн та SPA-догляд за руками й ногами.",
  },
  {
    slug: "cosmetology",
    name: "Косметологія",
    tagline: "Догляд за обличчям і тілом",
    description:
      "Апаратні та ін'єкційні методики, чистки, догляд преміум-рівня для здорового й доглянутого вигляду шкіри.",
  },
  {
    slug: "permanent",
    name: "Перманентний макіяж",
    tagline: "Брови, губи, міжвійна лінія",
    description:
      "Природний перманентний макіяж з акуратним підбором форми та пігменту під ваш кольоротип.",
  },
  {
    slug: "massage",
    name: "Масаж",
    tagline: "Релакс і терапевтичні методики",
    description:
      "Класичний, антицелюлітний та релакс-масаж — для відновлення тіла й повного перезавантаження.",
  },
];

export const services: Service[] = [
  // Hair
  {
    slug: "haircut-signature",
    categorySlug: "hair",
    name: "Авторська стрижка",
    description: "Стрижка з підбором форми під тип обличчя та структуру волосся, укладка у подарунок.",
    durationMinutes: 60,
    priceFrom: 900,
  },
  {
    slug: "color-balayage",
    categorySlug: "hair",
    name: "Балаяж / Шатуш",
    description: "М'який перехід кольору без різких меж, натуральний ефект вигорілого волосся.",
    durationMinutes: 180,
    priceFrom: 3200,
    priceTo: 5800,
  },
  {
    slug: "hair-restoration",
    categorySlug: "hair",
    name: "Відновлення структури волосся",
    description: "Комплексна процедура з ботексом або кератином для гладкого й живого волосся.",
    durationMinutes: 90,
    priceFrom: 1800,
  },
  // Nails
  {
    slug: "manicure-combo",
    categorySlug: "nails",
    name: "Комбінований манікюр + гель-лак",
    description: "Апаратна обробка, вирівнювання пластини, покриття гель-лаком у два шари.",
    durationMinutes: 90,
    priceFrom: 750,
  },
  {
    slug: "pedicure-spa",
    categorySlug: "nails",
    name: "SPA-педикюр",
    description: "Апаратний педикюр з парафінотерапією та масажем стоп.",
    durationMinutes: 100,
    priceFrom: 950,
  },
  {
    slug: "nail-art",
    categorySlug: "nails",
    name: "Авторський дизайн нігтів",
    description: "Індивідуальний дизайн будь-якої складності — від мінімалізму до арт-роботи.",
    durationMinutes: 30,
    priceFrom: 300,
  },
  // Cosmetology
  {
    slug: "facial-deep-cleansing",
    categorySlug: "cosmetology",
    name: "Комбінована чистка обличчя",
    description: "Механічна та ультразвукова чистка з заспокійливою маскою.",
    durationMinutes: 75,
    priceFrom: 1400,
  },
  {
    slug: "facial-hardware",
    categorySlug: "cosmetology",
    name: "Апаратний догляд за обличчям",
    description: "RF-ліфтинг або мезотерапія для тонусу й зволоження шкіри.",
    durationMinutes: 60,
    priceFrom: 1600,
  },
  {
    slug: "brow-lamination",
    categorySlug: "cosmetology",
    name: "Ламінування брів і вій",
    description: "Формування вигину, живлення та фарбування — ефект тримається до 6 тижнів.",
    durationMinutes: 60,
    priceFrom: 700,
  },
  // Permanent
  {
    slug: "pmu-brows",
    categorySlug: "permanent",
    name: "Перманентний макіяж брів",
    description: "Волосковий або пудровий метод з підбором форми під анатомію обличчя.",
    durationMinutes: 150,
    priceFrom: 3500,
  },
  {
    slug: "pmu-lips",
    categorySlug: "permanent",
    name: "Перманентний макіяж губ",
    description: "Природне тонування або чіткий контур з підбором відтінку.",
    durationMinutes: 150,
    priceFrom: 3800,
  },
  // Massage
  {
    slug: "massage-relax",
    categorySlug: "massage",
    name: "Релакс-масаж всього тіла",
    description: "Розслаблювальні техніки для зняття напруги та відновлення енергії.",
    durationMinutes: 60,
    priceFrom: 1100,
  },
  {
    slug: "massage-anticellulite",
    categorySlug: "massage",
    name: "Антицелюлітний масаж",
    description: "Курсова методика для покращення тонусу шкіри та контурів тіла.",
    durationMinutes: 50,
    priceFrom: 900,
  },
];

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getServicesByCategory(slug: string) {
  return services.filter((service) => service.categorySlug === slug);
}

export function getService(categorySlug: string, serviceSlug: string) {
  return services.find(
    (service) => service.categorySlug === categorySlug && service.slug === serviceSlug,
  );
}
