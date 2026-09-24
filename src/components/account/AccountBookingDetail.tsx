"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { AccountBookingDetail as AccountBookingDetailData } from "@/lib/account";
import { StatusBadge } from "@/components/master/StatusBadge";
import { CancelBookingModal } from "@/components/account/CancelBookingModal";
import { Button, ButtonAction } from "@/components/ui/button";

function fullDateUk(dateOnly: string, time: string): string {
  const label = format(new Date(`${dateOnly}T00:00:00.000Z`), "EEEE, d MMMM", { locale: uk });
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} о ${time}`;
}

function formatDurationUk(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60} год`;
  if (minutes > 60) return `${(Math.round((minutes / 60) * 10) / 10).toString().replace(/\.0$/, "")} год`;
  return `${minutes} хв`;
}

const REBOOKABLE_STATUSES = new Set(["pending", "confirmed", "completed"]);

export function AccountBookingDetail({ booking: initial }: { booking: NonNullable<AccountBookingDetailData> }) {
  const [booking, setBooking] = useState(initial);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${booking.id}/cancel`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося скасувати запис.");
        return;
      }
      setShowCancelModal(false);
      setBooking((b) => ({ ...b, status: "cancelled", canCancel: false }));
      router.refresh();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10">
      <Link href="/account/bookings" className="w-fit text-sm text-fg-subtle transition-colors hover:text-fg">
        ← Усі записи
      </Link>

      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl text-fg">{booking.serviceName}</h1>
            <span className="text-sm text-fg-muted">Майстер: {booking.master.name}</span>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fg-subtle">Дата й час</dt>
            <dd className="mt-1 text-fg">{fullDateUk(booking.date, booking.timeFrom)}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Філія</dt>
            <dd className="mt-1 text-fg">{booking.locationAddress}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Тривалість</dt>
            <dd className="mt-1 text-fg">{formatDurationUk(booking.durationMinutes)}</dd>
          </div>
          {booking.comment && (
            <div className="sm:col-span-2">
              <dt className="text-fg-subtle">Ваш коментар</dt>
              <dd className="mt-1 text-fg">&quot;{booking.comment}&quot;</dd>
            </div>
          )}
        </dl>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-wrap gap-3">
          {booking.canCancel && (
            <ButtonAction
              variant="outline"
              className="hover:border-red-400 hover:text-red-400"
              onClick={() => setShowCancelModal(true)}
            >
              Скасувати
            </ButtonAction>
          )}
          {REBOOKABLE_STATUSES.has(booking.status) && (
            <Button href={`/booking?masterId=${booking.master.id}&serviceId=${booking.serviceId}`} variant="outline">
              {booking.status === "completed" ? "Записатися знову" : "Перенести"}
            </Button>
          )}
        </div>
      </div>

      {showCancelModal && (
        <CancelBookingModal
          serviceName={booking.serviceName}
          dateLabel={fullDateUk(booking.date, booking.timeFrom)}
          loading={cancelling}
          onConfirm={handleCancel}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}
