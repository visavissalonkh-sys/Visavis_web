import type { Metadata } from "next";
import { subDays } from "date-fns";
import { getAdminAnalytics, getAdminBookingFormOptions } from "@/lib/admin";
import { formatDateOnly } from "@/lib/booking";
import { AdminAnalyticsDashboard } from "@/components/admin/AdminAnalyticsDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Аналітика",
  robots: { index: false, follow: false },
};

const DEFAULT_RANGE_DAYS = 30;

export default async function AdminAnalyticsPage() {
  const to = new Date();
  const from = subDays(to, DEFAULT_RANGE_DAYS - 1);
  const fromStr = formatDateOnly(from);
  const toStr = formatDateOnly(to);

  const [analytics, formOptions] = await Promise.all([
    getAdminAnalytics(fromStr, toStr),
    getAdminBookingFormOptions(),
  ]);

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Аналітика</h1>
        <p className="mt-1 text-sm text-fg-muted">Графіки та експорт звітів по записах</p>
      </div>

      <AdminAnalyticsDashboard
        initialFrom={fromStr}
        initialTo={toStr}
        initialAnalytics={analytics}
        masters={formOptions.masters}
        locations={formOptions.locations}
        statuses={formOptions.statuses}
      />
    </div>
  );
}
