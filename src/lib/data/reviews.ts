// Placeholder testimonials (fictional) — replace with real, moderated reviews once collected.

export type Review = {
  id: string;
  authorInitials: string;
  authorName: string;
  rating: number;
  text: string;
  categorySlug: string;
};

export const reviews: Review[] = [
  {
    id: "r1",
    authorInitials: "ОК",
    authorName: "Олена К.",
    rating: 5,
    text: "Найкращий балаяж за останні кілька років. Атмосфера салону — окремий кайф, все дуже стильно й затишно.",
    categorySlug: "hair",
  },
  {
    id: "r2",
    authorInitials: "МП",
    authorName: "Марія П.",
    rating: 5,
    text: "Хожу на манікюр вже пів року, жодного відколу за 3 тижні носіння. Дизайн завжди ідеально влучає в настрій.",
    categorySlug: "nails",
  },
  {
    id: "r3",
    authorInitials: "ІС",
    authorName: "Ірина С.",
    rating: 5,
    text: "Косметолог підібрала протокол саме під мою шкіру — результат видно вже після другої процедури.",
    categorySlug: "cosmetology",
  },
  {
    id: "r4",
    authorInitials: "ДВ",
    authorName: "Дарина В.",
    rating: 5,
    text: "Перманентний макіяж брів виглядає максимально природно, форма ідеально під моє обличчя.",
    categorySlug: "permanent",
  },
];
