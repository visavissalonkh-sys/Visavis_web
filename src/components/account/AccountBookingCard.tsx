import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { StatusBadge } from "@/components/master/StatusBadge";

export type AccountBookingListItem = {
  id: string;
  date: string;
  timeFrom: string;
  status: string;
  serviceName: string;
  master: { id: string; name: string; avatarUrl: string | null };
  hasReview: boolean;
};

export function AccountBookingCard({ booking }: { booking: AccountBookingListItem }) {
  const dateLabel = format(new Date(`${booking.date}T00:00:00.000Z`), "d MMMM", { locale: uk });

  return (
    <Link
      href={`/account/bookings/${booking.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-border sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <span className="text-fg">
          {dateLabel}, {booking.timeFrom} — {booking.serviceName}
        </span>
        <span className="text-sm text-fg-muted">{booking.master.name}</span>
      </div>
      <div className="flex items-center gap-2">
        {booking.status === "completed" && !booking.hasReview && (
          <span className="rounded-full border border-accent-border bg-accent-soft px-3 py-1 text-xs text-accent">
            Залишити відгук
          </span>
        )}
        <StatusBadge status={booking.status} />
      </div>
    </Link>
  );
}
