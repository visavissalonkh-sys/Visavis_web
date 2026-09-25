"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotosUploader } from "@/components/admin/PhotosUploader";
import { ButtonAction } from "@/components/ui/button";

type DayHours = { isOpen: boolean; from?: string; to?: string };
type WorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>;

const DAY_ORDER: (keyof WorkingHours)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<keyof WorkingHours, string> = {
  mon: "Понеділок", tue: "Вівторок", wed: "Середа", thu: "Четвер", fri: "П'ятниця", sat: "Субота", sun: "Неділя",
};

function closedWeek(): WorkingHours {
  return Object.fromEntries(DAY_ORDER.map((d) => [d, { isOpen: false }])) as WorkingHours;
}

export function AdminLocationForm({
  mode,
  locationId,
  initial,
}: {
  mode: "create" | "edit";
  locationId?: string;
  initial?: {
    name: string;
    address: string;
    phone: string;
    workingHours: WorkingHours;
    photoUrls: string[];
    latitude?: number | null;
    longitude?: number | null;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [latitude, setLatitude] = useState(initial?.latitude != null ? String(initial.latitude) : "");
  const [longitude, setLongitude] = useState(initial?.longitude != null ? String(initial.longitude) : "");
  const [workingHours, setWorkingHours] = useState<WorkingHours>(initial?.workingHours ?? closedWeek());
  const [photoUrls, setPhotoUrls] = useState<string[]>(initial?.photoUrls ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateDay(day: keyof WorkingHours, patch: Partial<DayHours>) {
    setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function save() {
    setError(null);
    if (!name.trim() || !address.trim() || !phone.trim()) {
      setError("Заповніть назву, адресу і телефон.");
      return;
    }

    const lat = latitude.trim() ? Number(latitude.trim()) : null;
    const lng = longitude.trim() ? Number(longitude.trim()) : null;
    if ((lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) || (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180))) {
      setError("Координати некоректні (широта -90…90, довгота -180…180).");
      return;
    }
    if ((lat === null) !== (lng === null)) {
      setError("Вкажіть і широту, і довготу — або залиште обидва поля порожніми.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        workingHours,
        photoUrls,
        latitude: lat,
        longitude: lng,
      };
      const url = mode === "create" ? "/api/admin/locations" : `/api/admin/locations/${locationId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося зберегти філію.");
        return;
      }
      router.push("/admin/locations");
      router.refresh();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Назва</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Телефон</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Адреса</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={300}
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">
          Координати (для карти й SEO) <span className="text-fg-subtle">— необов&apos;язково</span>
        </label>
        <p className="text-xs text-fg-subtle">
          Знайдіть точку на Google Maps, ПКМ на місці → перше число в контекстному меню це широта, друге — довгота.
        </p>
        <div className="flex gap-3">
          <input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="Широта, напр. 49.9935"
            inputMode="decimal"
            className="w-1/2 rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
          <input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="Довгота, напр. 36.2304"
            inputMode="decimal"
            className="w-1/2 rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Години роботи</label>
        {DAY_ORDER.map((day) => {
          const d = workingHours[day];
          return (
            <div key={day} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex w-36 items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={d.isOpen}
                  onChange={(e) => updateDay(day, { isOpen: e.target.checked, from: d.from ?? "09:00", to: d.to ?? "21:00" })}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                {DAY_LABELS[day]}
              </label>
              {d.isOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={d.from ?? "09:00"}
                    onChange={(e) => updateDay(day, { from: e.target.value })}
                    className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1 text-sm text-fg outline-none focus:border-accent"
                  />
                  <span className="text-fg-subtle">—</span>
                  <input
                    type="time"
                    value={d.to ?? "21:00"}
                    onChange={(e) => updateDay(day, { to: e.target.value })}
                    className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1 text-sm text-fg outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <span className="text-xs text-fg-subtle">Зачинено</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Фото</label>
        <PhotosUploader photoUrls={photoUrls} onChange={setPhotoUrls} purpose="location" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ButtonAction onClick={save} disabled={saving} className="w-fit">
        {saving ? "Зберігаємо…" : mode === "create" ? "Створити філію" : "Зберегти зміни"}
      </ButtonAction>
    </div>
  );
}
