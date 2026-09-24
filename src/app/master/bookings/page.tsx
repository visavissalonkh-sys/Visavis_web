import type { Metadata } from "next";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getBookingsList, getMasterForSession } from "@/lib/master";
import { BookingCard } from "@/components/master/BookingCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Записи",
  robots: { index: false, follow: false },
};

const STATUS_FILTERS: { value: BookingStatus | undefined; label: string }[] = [
  { value: undefined, label: "Усі" },
  { value: "pending", label: "Очікують" },
  { value: "confirmed", label: "Підтверджені" },
  { value: "completed", label: "Завершені" },
  { value: "cancelled", label: "Скасовані" },
];

export default async function MasterBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string; page?: string }>;
}) {
  const { status, date, page } = await searchParams;

  const session = await getSession();
  const master = await getMasterForSession(session!);

  const data = await getBookingsList({
    masterId: master!.id,
    status: status as BookingStatus | undefined,
    date,
    page: page ? Number(page) : 1,
  });

  function filterHref(nextStatus?: BookingStatus) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (date) params.set("date", date);
    const query = params.toString();
    return `/master/bookings${query ? `?${query}` : ""}`;
  }

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (date) params.set("date", date);
    params.set("page", String(nextPage));
    return `/master/bookings?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Записи</h1>
        <p className="mt-1 text-sm text-fg-muted">Усього: {data.total}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filterHref(filter.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              (status ?? undefined) === filter.value
                ? "border-accent bg-accent-soft text-accent"
                : "border-border-strong text-fg-muted hover:text-fg",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {data.bookings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-fg-muted">
          Немає записів за цим фільтром.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {data.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            href={pageHref(Math.max(1, data.page - 1))}
            className={cn("text-fg-muted hover:text-fg", data.page <= 1 && "pointer-events-none opacity-30")}
          >
            ← Попередня
          </Link>
          <span className="text-fg-subtle">
            {data.page} / {data.totalPages}
          </span>
          <Link
            href={pageHref(Math.min(data.totalPages, data.page + 1))}
            className={cn(
              "text-fg-muted hover:text-fg",
              data.page >= data.totalPages && "pointer-events-none opacity-30",
            )}
          >
            Наступна →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
