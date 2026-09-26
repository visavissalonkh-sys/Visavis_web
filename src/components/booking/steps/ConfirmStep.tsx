"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { ButtonAction } from "@/components/ui/button";
import { GuestBookingForm } from "@/components/booking/GuestBookingForm";
import type { WizardLocation, WizardMaster, WizardService } from "@/components/booking/types";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ConfirmStep({
  service,
  master,
  location,
  date,
  time,
  lockToken,
  expiresAt,
  isAuthenticated,
  currentUser,
  onBack,
  onExpired,
  onSuccess,
  onGuestSuccess,
}: {
  service: WizardService;
  master: WizardMaster;
  location: WizardLocation;
  date: string;
  time: string;
  lockToken: string;
  expiresAt: number;
  isAuthenticated: boolean;
  currentUser: { name: string | null; phone: string } | null;
  onBack: () => void;
  onExpired: () => void;
  onSuccess: (bookingId: string) => void;
  onGuestSuccess: (bookingId: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [remainingMs, setRemainingMs] = useState(() => expiresAt - Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = expiresAt - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpired();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  async function submitBooking() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          masterId: master.id,
          locationId: location.id,
          date,
          timeFrom: time,
          lockToken,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Не вдалося створити запис. Спробуйте ще раз.");
        return;
      }

      onSuccess(data.bookingId);
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  const dateLabel = format(new Date(`${date}T00:00:00.000Z`), "d MMMM yyyy", { locale: uk });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-fg-muted hover:text-fg">
          ← Змінити час
        </button>
        <h2 className="mt-3 font-display text-2xl text-fg sm:text-3xl">Підтвердження запису</h2>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
        <Row label="Послуга" value={service.name} />
        <Row label="Майстер" value={master.name} />
        <Row label="Адреса" value={location.address} />
        <Row label="Дата й час" value={`${dateLabel}, ${time}`} />
        <Row label="Тривалість" value={`${service.durationMinutes} хв`} />
        <Row
          label="Вартість"
          value={`від ${service.priceFrom} ₴${service.priceTo ? ` до ${service.priceTo} ₴` : ""}`}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-accent-border bg-accent-soft p-4 text-sm text-fg">
        Ваш час заброньовано на {formatCountdown(remainingMs)}
      </div>

      {isAuthenticated ? (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-fg-subtle">Ваші контакти</span>
            <Row label="Ім'я" value={currentUser?.name ?? "—"} />
            <Row label="Телефон" value={currentUser?.phone ?? "—"} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="comment" className="text-sm text-fg-muted">
              Коментар (необов’язково)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Вперше у вас / алергія на гель / бажаю певний дизайн"
              className="w-full resize-none rounded-xl border border-border-strong bg-surface px-4 py-3 text-base text-fg outline-none transition-colors focus:border-accent"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <ButtonAction onClick={submitBooking} disabled={submitting} size="lg">
            {submitting ? "Оформлюємо…" : "Підтвердити запис"}
          </ButtonAction>
        </>
      ) : (
        <GuestBookingForm
          serviceId={service.id}
          masterId={master.id}
          locationId={location.id}
          date={date}
          timeFrom={time}
          lockToken={lockToken}
          onSuccess={onGuestSuccess}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-fg-subtle">{label}</span>
      <span className="text-right text-sm text-fg">{value}</span>
    </div>
  );
}
