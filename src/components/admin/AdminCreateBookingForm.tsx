"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonAction } from "@/components/ui/button";

type FormOptions = {
  locations: { id: string; name: string }[];
  masters: { id: string; name: string; serviceIds: string[] }[];
  services: { id: string; name: string; durationMinutes: number }[];
};

type ClientLookupResult = { id: string; name: string | null; phone: string; role: string } | null;

export function AdminCreateBookingForm({ formOptions }: { formOptions: FormOptions }) {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [lookupDone, setLookupDone] = useState(false);
  const [foundClient, setFoundClient] = useState<ClientLookupResult>(null);
  const [clientName, setClientName] = useState("");
  const [looking, setLooking] = useState(false);

  const [serviceId, setServiceId] = useState("");
  const [masterId, setMasterId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [comment, setComment] = useState("");

  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMasters = useMemo(
    () => (serviceId ? formOptions.masters.filter((m) => m.serviceIds.includes(serviceId)) : formOptions.masters),
    [serviceId, formOptions.masters],
  );

  async function lookupClient() {
    if (!phone.trim()) return;
    setLooking(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/lookup?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      setFoundClient(data.client ?? null);
      setLookupDone(true);
    } catch {
      setError("Не вдалося перевірити номер. Спробуйте ще раз.");
    } finally {
      setLooking(false);
    }
  }

  async function loadSlots() {
    if (!masterId || !locationId || !serviceId || !date) return;
    setLoadingSlots(true);
    setSlots(null);
    setTimeFrom("");
    setError(null);
    try {
      const params = new URLSearchParams({ masterId, locationId, serviceId, date });
      const res = await fetch(`/api/booking/availability?${params.toString()}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setError("Не вдалося завантажити вільний час.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submit() {
    setError(null);
    if (!phone.trim() || !serviceId || !masterId || !locationId || !date || !timeFrom) {
      setError("Заповніть усі обов'язкові поля.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientPhone: phone.trim(),
          clientName: foundClient ? undefined : clientName.trim() || undefined,
          serviceId,
          masterId,
          locationId,
          date,
          timeFrom,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося створити запис.");
        return;
      }
      router.push("/admin/bookings");
      router.refresh();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Телефон клієнта</label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setLookupDone(false);
              setFoundClient(null);
            }}
            placeholder="+380 XX XXX XX XX"
            className="flex-1 rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
          <ButtonAction variant="outline" onClick={lookupClient} disabled={looking || !phone.trim()}>
            {looking ? "Шукаємо…" : "Знайти"}
          </ButtonAction>
        </div>

        {lookupDone && foundClient && (
          <p className="text-sm text-accent">
            Знайдено: {foundClient.name ?? "без імені"} ({foundClient.phone})
          </p>
        )}
        {lookupDone && !foundClient && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-fg-muted">Новий клієнт — вкажіть ім&apos;я:</p>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ім'я клієнта"
              className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Послуга</label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setMasterId("");
              setSlots(null);
            }}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg"
          >
            <option value="">Оберіть послугу</option>
            {formOptions.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} хв)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Майстер</label>
          <select
            value={masterId}
            onChange={(e) => {
              setMasterId(e.target.value);
              setSlots(null);
            }}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg"
          >
            <option value="">Оберіть майстра</option>
            {availableMasters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Філія</label>
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setSlots(null);
            }}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg"
          >
            <option value="">Оберіть філію</option>
            {formOptions.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Дата</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlots(null);
            }}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg"
          />
        </div>
      </div>

      <ButtonAction
        variant="outline"
        onClick={loadSlots}
        disabled={loadingSlots || !masterId || !locationId || !serviceId || !date}
        className="w-fit"
      >
        {loadingSlots ? "Завантажуємо…" : "Показати вільний час"}
      </ButtonAction>

      {slots !== null && (
        <div className="flex flex-col gap-2">
          {slots.length === 0 ? (
            <p className="text-sm text-fg-subtle">Немає вільного часу на цю дату.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeFrom(slot)}
                  className={
                    timeFrom === slot
                      ? "rounded-full border border-accent bg-accent-soft px-4 py-1.5 text-sm text-accent"
                      : "rounded-full border border-border-strong px-4 py-1.5 text-sm text-fg-muted hover:text-fg"
                  }
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Коментар (необов&apos;язково)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ButtonAction onClick={submit} disabled={submitting || !timeFrom} className="w-fit">
        {submitting ? "Створюємо…" : "Створити запис"}
      </ButtonAction>
    </div>
  );
}
