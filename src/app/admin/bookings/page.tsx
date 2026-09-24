import type { Metadata } from "next";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { getAdminBookingsList, getAdminBookingFormOptions, type AdminBookingsSortBy } from "@/lib/admin";
import { AdminBookingsFilters } from "@/components/admin/AdminBookingsFilters";
import { AdminBookingsTable } from "@/components/admin/AdminBookingsTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Записи",
  robots: { index: false, follow: false },
};

const ALL_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const SORT_COLUMNS: AdminBookingsSortBy[] = ["date", "client", "master", "service", "location", "status"];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const dateFrom = sp.dateFrom;
  const dateTo = sp.dateTo;
  const masterId = sp.masterId;
  const locationId = sp.locationId;
  const search = sp.search;
  const statuses = sp.status
    ? sp.status.split(",").filter((s): s is BookingStatus => ALL_STATUSES.includes(s as BookingStatus))
    : [];
  const sortBy: AdminBookingsSortBy = SORT_COLUMNS.includes(sp.sortBy as AdminBookingsSortBy)
    ? (sp.sortBy as AdminBookingsSortBy)
    : "date";
  const sortDir = sp.sortDir === "asc" ? "asc" : "desc";
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  const [list, formOptions] = await Promise.all([
    getAdminBookingsList({ dateFrom, dateTo, masterId, locationId, statuses, search, sortBy, sortDir, page }),
    getAdminBookingFormOptions(),
  ]);

  const currentQuery = new URLSearchParams();
  if (dateFrom) currentQuery.set("dateFrom", dateFrom);
  if (dateTo) currentQuery.set("dateTo", dateTo);
  if (masterId) currentQuery.set("masterId", masterId);
  if (locationId) currentQuery.set("locationId", locationId);
  if (statuses.length > 0) currentQuery.set("status", statuses.join(","));
  if (search) currentQuery.set("search", search);
  currentQuery.set("sortBy", sortBy);
  currentQuery.set("sortDir", sortDir);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams(currentQuery);
    params.set("page", String(nextPage));
    return `/admin/bookings?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Записи</h1>
          <p className="mt-1 text-sm text-fg-muted">Усього: {list.total}</p>
        </div>
        <Button href="/admin/bookings/new">Створити запис</Button>
      </div>

      <AdminBookingsFilters
        initial={{ dateFrom, dateTo, masterId, locationId, statuses, search }}
        locations={formOptions.locations}
        masters={formOptions.masters}
      />

      <AdminBookingsTable bookings={list.bookings} currentQuery={currentQuery} sortBy={sortBy} sortDir={sortDir} />

      {list.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            href={pageHref(Math.max(1, list.page - 1))}
            className={cn("text-fg-muted hover:text-fg", list.page <= 1 && "pointer-events-none opacity-30")}
          >
            ← Попередня
          </Link>
          <span className="text-fg-subtle">
            {list.page} / {list.totalPages}
          </span>
          <Link
            href={pageHref(Math.min(list.totalPages, list.page + 1))}
            className={cn("text-fg-muted hover:text-fg", list.page >= list.totalPages && "pointer-events-none opacity-30")}
          >
            Наступна →
          </Link>
        </div>
      )}
    </div>
  );
}
