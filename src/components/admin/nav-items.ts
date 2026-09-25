// Grows one entry per subblock as each /admin/* page actually lands —
// no point linking to a route that 404s.
export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Дашборд", icon: "◆" },
  { href: "/admin/bookings", label: "Записи", icon: "📋" },
  { href: "/admin/masters", label: "Майстри", icon: "👥" },
  { href: "/admin/services", label: "Послуги", icon: "💅" },
  { href: "/admin/locations", label: "Філії", icon: "📍" },
  { href: "/admin/reviews", label: "Відгуки", icon: "⭐" },
] as const;
