import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Адмін-панель",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="font-display text-2xl text-fg sm:text-3xl">Адмін-панель</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Layout, middleware і аудит доступу готові. Дашборд із метриками — наступний підблок.
      </p>
    </div>
  );
}
