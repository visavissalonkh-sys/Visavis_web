import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { StatusBadge } from "@/components/master/StatusBadge";

export type BookingListItem = {
  id: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  status: string;
  serviceName: string;
  locationName: string;
  clientName: string | null;
  clientPhone: string;
};

export function BookingCard({ booking }: { booking: BookingListItem }) {
  const dateLabel = format(new Date(`${booking.date}T00:00:00.000Z`), "d MMMM", { locale: uk });

  return (
    <Link
      href={`/master/bookings/${booking.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-border sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <span className="text-fg">
          {dateLabel}, {booking.timeFrom} — {booking.serviceName}
        </span>
        <span className="text-sm text-fg-muted">
          {booking.clientName ?? "Клієнт"} · {booking.clientPhone}
        </span>
        <span className="text-xs text-fg-subtle">{booking.locationName}</span>
      </div>
      <StatusBadge status={booking.status} />
    </Link>
  );
}
