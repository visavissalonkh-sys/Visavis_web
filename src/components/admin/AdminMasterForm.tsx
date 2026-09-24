"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUploader } from "@/components/master/AvatarUploader";
import { ButtonAction } from "@/components/ui/button";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Неділя", 1: "Понеділок", 2: "Вівторок", 3: "Середа", 4: "Четвер", 5: "П'ятниця", 6: "Субота",
};

type ScheduleDay = { weekday: number; isWorking: boolean; timeFrom: string | null; timeTo: string | null };
type LocationSchedule = { locationId: string; locationName: string; days: ScheduleDay[] };

function emptyWeek(): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, weekday) => ({ weekday, isWorking: false, timeFrom: null, timeTo: null }));
}

type Service = { id: string; category: string; name: string };

export function AdminMasterForm({
  mode,
  masterId,
  initialName = "",
  initialPhone = "",
  initialBio = "",
  initialInstagramUrl = "",
  initialAvatarUrl = null,
  initialSpecialtyIds = [],
  services,
  allLocations,
  initialSchedules,
}: {
  mode: "create" | "edit";
  masterId?: string;
  initialName?: string;
  initialPhone?: string;
  initialBio?: string;
  initialInstagramUrl?: string;
  initialAvatarUrl?: string | null;
  initialSpecialtyIds?: string[];
  services: Service[];
  allLocations: { id: string; name: string }[];
  initialSchedules?: LocationSchedule[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [bio, setBio] = useState(initialBio);
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [specialtyIds, setSpecialtyIds] = useState(new Set(initialSpecialtyIds));
  const [schedules, setSchedules] = useState<Map<string, ScheduleDay[]>>(
    () =>
      new Map(
        allLocations.map((loc) => [
          loc.id,
          initialSchedules?.find((s) => s.locationId === loc.id)?.days ?? emptyWeek(),
        ]),
      ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const servicesByCategory = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return map;
  }, [services]);

  function toggleSpecialty(id: string) {
    setSpecialtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateDay(locationId: string, weekday: number, patch: Partial<ScheduleDay>) {
    setSchedules((prev) => {
      const next = new Map(prev);
      const days = (next.get(locationId) ?? emptyWeek()).map((d) => (d.weekday === weekday ? { ...d, ...patch } : d));
      next.set(locationId, days);
      return next;
    });
  }

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Вкажіть ім'я майстра.");
      return;
    }
    if (mode === "create" && !phone.trim()) {
      setError("Вкажіть номер телефону майстра.");
      return;
    }

    setSaving(true);
    try {
      const schedulesPayload = allLocations.map((loc) => ({
        locationId: loc.id,
        schedule: (schedules.get(loc.id) ?? emptyWeek()).map((d) => ({
          weekday: d.weekday,
          isWorking: d.isWorking,
          timeFrom: d.timeFrom ?? undefined,
          timeTo: d.timeTo ?? undefined,
        })),
      }));

      const body: Record<string, unknown> = {
        name: name.trim(),
        bio: bio.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        avatarUrl: avatarUrl ?? undefined,
        specialtyServiceIds: [...specialtyIds],
        schedules: schedulesPayload,
      };

      const url = mode === "create" ? "/api/admin/masters" : `/api/admin/masters/${masterId}`;
      if (mode === "create") body.phone = phone.trim();

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Не вдалося зберегти майстра.");
        return;
      }
      router.push("/admin/masters");
      router.refresh();
    } catch {
      setError("Немає з'єднання. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <AvatarUploader
        name={name || "Майстер"}
        avatarUrl={avatarUrl}
        onUploaded={setAvatarUrl}
        signatureEndpoint="/api/admin/masters/avatar-signature"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Ім&apos;я</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-fg-subtle">Телефон</label>
          {mode === "create" ? (
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380 XX XXX XX XX"
              className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
            />
          ) : (
            <span className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg-subtle">
              {initialPhone} (незмінно)
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Instagram (необов&apos;язково)</label>
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://instagram.com/..."
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-fg-subtle">Bio (необов&apos;язково)</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          className="rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm text-fg-subtle">Спеціалізації</label>
        {[...servicesByCategory.entries()].map(([category, categoryServices]) => (
          <div key={category} className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-fg-subtle">{category}</span>
            <div className="flex flex-wrap gap-2">
              {categoryServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpecialty(s.id)}
                  className={
                    specialtyIds.has(s.id)
                      ? "rounded-full border border-accent bg-accent-soft px-3 py-1 text-xs text-accent"
                      : "rounded-full border border-border-strong px-3 py-1 text-xs text-fg-muted hover:text-fg"
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <label className="text-sm text-fg-subtle">Розклад по філіях</label>
        {allLocations.map((loc) => (
          <div key={loc.id} className="flex flex-col gap-2 rounded-xl border border-border p-4">
            <span className="text-sm text-fg">{loc.name}</span>
            {WEEKDAY_ORDER.map((weekday) => {
              const day = (schedules.get(loc.id) ?? emptyWeek()).find((d) => d.weekday === weekday)!;
              return (
                <div key={weekday} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <label className="flex w-36 items-center gap-2 text-sm text-fg">
                    <input
                      type="checkbox"
                      checked={day.isWorking}
                      onChange={(e) =>
                        updateDay(loc.id, weekday, {
                          isWorking: e.target.checked,
                          timeFrom: day.timeFrom ?? "10:00",
                          timeTo: day.timeTo ?? "19:00",
                        })
                      }
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    {WEEKDAY_LABELS[weekday]}
                  </label>
                  {day.isWorking ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.timeFrom ?? "10:00"}
                        onChange={(e) => updateDay(loc.id, weekday, { timeFrom: e.target.value })}
                        className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1 text-sm text-fg outline-none focus:border-accent"
                      />
                      <span className="text-fg-subtle">—</span>
                      <input
                        type="time"
                        value={day.timeTo ?? "19:00"}
                        onChange={(e) => updateDay(loc.id, weekday, { timeTo: e.target.value })}
                        className="rounded-lg border border-border-strong bg-surface-2 px-3 py-1 text-sm text-fg outline-none focus:border-accent"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-fg-subtle">Не працює</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ButtonAction onClick={save} disabled={saving} className="w-fit">
        {saving ? "Зберігаємо…" : mode === "create" ? "Створити майстра" : "Зберегти зміни"}
      </ButtonAction>
    </div>
  );
}
