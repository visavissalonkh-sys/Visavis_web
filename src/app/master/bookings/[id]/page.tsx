import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { getSession } from "@/lib/auth";
import { getBookingDetail, getMasterForSession } from "@/lib/master";
import { StatusBadge } from "@/components/master/StatusBadge";
import { STATUS_LABELS } from "@/components/master/status-badge";
import { ClientCard } from "@/components/master/ClientCard";
import { BookingActions } from "@/components/master/BookingActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Деталі запису",
  robots: { index: false, follow: false },
};

export default async function MasterBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const master = await getMasterForSession(session!);

  const detail = await getBookingDetail(master!.id, id);
  if (!detail) notFound();

  const { booking, client, statusHistory } = detail;
  const dateLabel = format(new Date(`${booking.date}T00:00:00.000Z`), "d MMMM yyyy", { locale: uk });

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-10">
      <Link href="/master/bookings" className="text-sm text-fg-muted hover:text-fg">
        ← Усі записи
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl text-fg">{booking.serviceName}</h1>
                <p className="mt-1 text-sm text-fg-muted">
                  {dateLabel}, {booking.timeFrom}–{booking.timeTo} · {booking.durationMinutes} хв
                </p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <p className="text-sm text-fg-muted">{booking.locationAddress}</p>

            {booking.comment ? (
              <div className="rounded-xl border border-border-strong bg-surface-2 p-4 text-sm text-fg">
                💬 «{booking.comment}»
              </div>
            ) : null}

            <BookingActions bookingId={booking.id} status={booking.status} />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-fg-subtle">Історія статусу</span>
            <div className="flex flex-col gap-2">
              {statusHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-fg">{STATUS_LABELS[entry.status] ?? entry.status}</span>
                  <span className="text-fg-subtle">
                    {format(new Date(entry.at), "d MMMM, HH:mm", { locale: uk })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ClientCard client={client} />
      </div>
    </div>
  );
}
